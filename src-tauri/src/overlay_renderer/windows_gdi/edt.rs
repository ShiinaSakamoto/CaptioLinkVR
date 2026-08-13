// 袋文字用のユークリッド距離変換。

/// Felzenszwalb & Huttenlocher の 2D 二乗ユークリッド距離変換。
/// 各画素について「最も近いインク画素」の距離^2 とそのカバレッジを返す。
pub(super) fn euclidean_edt_with_coverage(
    src: &[u8],
    width: usize,
    height: usize,
) -> (Vec<i64>, Vec<u8>) {
    const INF: i64 = 1_000_000_000;
    let n = width * height;
    let mut dist_v = vec![INF; n];
    let mut cov_v = vec![0u8; n];

    // 縦方向: 各列で最も近いインクまでの 1D 距離とカバレッジ。
    for x in 0..width {
        let mut last_d = INF;
        let mut last_c = 0u8;
        for y in 0..height {
            let i = y * width + x;
            if src[i] > 0 {
                last_d = 0;
                last_c = src[i];
            } else if last_d < INF {
                last_d += 1;
            }
            dist_v[i] = last_d;
            cov_v[i] = last_c;
        }

        last_d = INF;
        last_c = 0;
        for y in (0..height).rev() {
            let i = y * width + x;
            if src[i] > 0 {
                last_d = 0;
                last_c = src[i];
            } else if last_d < INF {
                last_d += 1;
            }
            if last_d < dist_v[i] {
                dist_v[i] = last_d;
                cov_v[i] = last_c;
            }
        }
    }

    let mut dist = vec![INF; n];
    let mut coverage = vec![0u8; n];

    // 横方向: 縦結果を f(x)=d^2 として 1D 二乗 EDT。
    for y in 0..height {
        let row = y * width;
        let mut f = vec![INF; width];
        let mut labels = vec![0u8; width];
        for x in 0..width {
            let d = dist_v[row + x];
            if d < INF / 2 {
                f[x] = d * d;
                labels[x] = cov_v[row + x];
            }
        }
        let (row_dist, row_cov) = squared_edt_1d_with_labels(&f, &labels);
        dist[row..row + width].copy_from_slice(&row_dist);
        coverage[row..row + width].copy_from_slice(&row_cov);
    }

    (dist, coverage)
}

pub(super) fn floor_div(a: i64, b: i64) -> i64 {
    let mut q = a / b;
    let r = a % b;
    if r != 0 && (r < 0) != (b < 0) {
        q -= 1;
    }
    q
}

/// 1D 二乗距離変換（有限サイトのみ）。labels はサイトのカバレッジ。
pub(super) fn squared_edt_1d_with_labels(f: &[i64], labels: &[u8]) -> (Vec<i64>, Vec<u8>) {
    const INF: i64 = 1_000_000_000;
    let n = f.len();
    let mut dist = vec![INF; n];
    let mut out_labels = vec![0u8; n];

    let sites: Vec<usize> = (0..n).filter(|&q| f[q] < INF / 2).collect();
    if sites.is_empty() {
        return (dist, out_labels);
    }

    // Felzenszwalb & Huttenlocher の下側包絡線。
    let mut v: Vec<usize> = Vec::with_capacity(sites.len());
    let mut z: Vec<i64> = Vec::with_capacity(sites.len() + 1);
    v.push(sites[0]);
    z.push(i64::MIN / 4);
    z.push(i64::MAX / 4);
    let mut k = 0usize;

    for &q in &sites[1..] {
        let mut s;
        loop {
            let r = v[k];
            let denom = 2 * (q as i64 - r as i64);
            s = floor_div(
                (f[q] + (q as i64) * (q as i64)) - (f[r] + (r as i64) * (r as i64)),
                denom,
            );
            if s > z[k] {
                break;
            }
            if k == 0 {
                break;
            }
            k -= 1;
        }
        k += 1;
        if k < v.len() {
            v.truncate(k);
            z.truncate(k);
            v.push(q);
            z.push(s);
            z.push(i64::MAX / 4);
        } else {
            z.pop();
            z.push(s);
            z.push(i64::MAX / 4);
            v.push(q);
        }
    }

    k = 0;
    for q in 0..n {
        while k + 1 < z.len() && z[k + 1] < q as i64 {
            k += 1;
        }
        let site = v[k];
        let dx = q as i64 - site as i64;
        dist[q] = dx * dx + f[site];
        out_labels[q] = labels[site];
    }

    (dist, out_labels)
}

#[cfg(test)]
mod tests {
    use super::{euclidean_edt_with_coverage, squared_edt_1d_with_labels};

    #[test]
    fn squared_edt_1d_finds_nearest_site() {
        const INF: i64 = 1_000_000_000;
        let f = [INF, 0, INF, INF, 0, INF];
        let labels = [0, 10, 0, 0, 20, 0];
        let (dist, cov) = squared_edt_1d_with_labels(&f, &labels);
        assert_eq!(dist[1], 0);
        assert_eq!(cov[1], 10);
        assert_eq!(dist[4], 0);
        assert_eq!(cov[4], 20);
        assert_eq!(dist[0], 1);
        assert_eq!(cov[0], 10);
        assert_eq!(dist[2], 1);
        assert_eq!(cov[2], 10);
        assert_eq!(dist[3], 1);
        assert_eq!(cov[3], 20);
    }

    #[test]
    fn euclidean_edt_dilates_within_radius() {
        // 5x5、中央だけインク。
        let mut src = vec![0u8; 25];
        src[12] = 200;
        let (dist_sq, cov) = euclidean_edt_with_coverage(&src, 5, 5);
        assert_eq!(dist_sq[12], 0);
        assert_eq!(cov[12], 200);
        // 半径2以内はカバー、角(0,0)は dist^2=8 > 4 なので半径2では外。
        assert_eq!(dist_sq[0], 8);
        assert_eq!(cov[0], 200);
        assert!(dist_sq[7] <= 4); // (1,2) 隣接
        assert_eq!(cov[7], 200);
    }
}
