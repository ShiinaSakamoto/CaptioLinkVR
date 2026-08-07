use std::net::UdpSocket;

const CHATBOX_INPUT_ADDRESS: &str = "/chatbox/input";
const DEFAULT_NOTIFICATION: bool = true;

pub fn send_chatbox_message(text: &str, host: &str, port: u16) -> Result<(), String> {
    let message = text.trim();
    if message.is_empty() {
        return Ok(());
    }

    let target = format!("{host}:{port}");
    let packet = encode_chatbox_input(message, DEFAULT_NOTIFICATION);
    let socket = UdpSocket::bind("0.0.0.0:0")
        .map_err(|error| format!("failed to bind OSC UDP socket: {error}"))?;
    socket
        .send_to(&packet, target)
        .map_err(|error| format!("failed to send OSC chatbox message: {error}"))?;
    Ok(())
}

fn encode_chatbox_input(message: &str, notification: bool) -> Vec<u8> {
    let mut packet = Vec::new();
    push_osc_string(&mut packet, CHATBOX_INPUT_ADDRESS);
    push_osc_string(&mut packet, if notification { ",sTT" } else { ",sTF" });
    push_osc_string(&mut packet, message);
    packet
}

fn push_osc_string(packet: &mut Vec<u8>, value: &str) {
    packet.extend_from_slice(value.as_bytes());
    packet.push(0);
    while packet.len() % 4 != 0 {
        packet.push(0);
    }
}

#[cfg(test)]
mod tests {
    use super::encode_chatbox_input;

    #[test]
    fn encodes_vrchat_chatbox_input_packet() {
        let packet = encode_chatbox_input("hello", true);
        assert_eq!(&packet[0..16], b"/chatbox/input\0\0");
        assert_eq!(&packet[16..20], b",sTT");
        assert_eq!(&packet[24..32], b"hello\0\0\0");
    }

    #[test]
    fn encodes_notification_false_as_false_typetag() {
        let packet = encode_chatbox_input("hi", false);
        assert_eq!(&packet[16..20], b",sTF");
    }
}
