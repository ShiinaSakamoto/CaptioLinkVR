//! CPU RGBA → D3D11 テクスチャへ載せ、OpenVR の SetOverlayTexture で使う。

use std::ffi::c_void;

use windows::core::Interface;
use windows::Win32::Foundation::HMODULE;
use windows::Win32::Graphics::Direct3D::{D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_WARP};
use windows::Win32::Graphics::Direct3D11::{
    D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D,
    D3D11_BIND_SHADER_RESOURCE, D3D11_CREATE_DEVICE_FLAG, D3D11_SDK_VERSION, D3D11_TEXTURE2D_DESC,
    D3D11_USAGE_DEFAULT,
};
use windows::Win32::Graphics::Dxgi::Common::{DXGI_FORMAT_R8G8B8A8_UNORM, DXGI_SAMPLE_DESC};

pub struct D3d11OverlayTexture {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    texture: Option<ID3D11Texture2D>,
    width: u32,
    height: u32,
}

impl D3d11OverlayTexture {
    pub fn new() -> Result<Self, String> {
        let mut device = None;
        let mut context = None;
        let flags = D3D11_CREATE_DEVICE_FLAG(0);

        let hardware = unsafe {
            D3D11CreateDevice(
                None,
                D3D_DRIVER_TYPE_HARDWARE,
                HMODULE::default(),
                flags,
                None,
                D3D11_SDK_VERSION,
                Some(&mut device),
                None,
                Some(&mut context),
            )
        };

        if hardware.is_err() {
            unsafe {
                D3D11CreateDevice(
                    None,
                    D3D_DRIVER_TYPE_WARP,
                    HMODULE::default(),
                    flags,
                    None,
                    D3D11_SDK_VERSION,
                    Some(&mut device),
                    None,
                    Some(&mut context),
                )
            }
            .map_err(|error| format!("D3D11CreateDevice failed: {error}"))?;
        }

        Ok(Self {
            device: device.ok_or_else(|| "D3D11 device missing".to_string())?,
            context: context.ok_or_else(|| "D3D11 context missing".to_string())?,
            texture: None,
            width: 0,
            height: 0,
        })
    }

    /// RGBA8 を GPU テクスチャへ書き込み、OpenVR に渡す生ポインタを返す。
    pub fn upload_rgba(
        &mut self,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) -> Result<*mut c_void, String> {
        let expected = width as usize * height as usize * 4;
        if pixels.len() != expected {
            return Err(format!(
                "RGBA length mismatch: got {}, expected {expected}",
                pixels.len()
            ));
        }
        if width == 0 || height == 0 {
            return Err("texture size must be non-zero".to_string());
        }

        if self.texture.is_none() || self.width != width || self.height != height {
            self.recreate_texture(width, height)?;
        }

        let texture = self
            .texture
            .as_ref()
            .ok_or_else(|| "D3D11 texture missing".to_string())?;

        unsafe {
            self.context
                .UpdateSubresource(texture, 0, None, pixels.as_ptr().cast(), width * 4, 0);
        }

        Ok(texture.as_raw())
    }

    pub fn flush(&self) {
        unsafe {
            self.context.Flush();
        }
    }

    fn recreate_texture(&mut self, width: u32, height: u32) -> Result<(), String> {
        let desc = D3D11_TEXTURE2D_DESC {
            Width: width,
            Height: height,
            MipLevels: 1,
            ArraySize: 1,
            Format: DXGI_FORMAT_R8G8B8A8_UNORM,
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: D3D11_BIND_SHADER_RESOURCE.0 as u32,
            CPUAccessFlags: 0,
            MiscFlags: 0,
        };

        let mut texture = None;
        unsafe {
            self.device
                .CreateTexture2D(&desc, None, Some(&mut texture))
                .map_err(|error| format!("CreateTexture2D failed: {error}"))?;
        }

        self.texture = texture;
        self.width = width;
        self.height = height;
        Ok(())
    }
}
