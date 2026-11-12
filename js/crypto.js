/**
 * SmartESS Web - Pure JavaScript SHA-1 implementation
 * Compatible with both file:// and https:// environments without external dependencies.
 */
(function (global) {
  function sha1(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const words = [];
    for (let i = 0; i < utf8.length; i++) {
      words[i >> 2] |= utf8.charCodeAt(i) << (24 - (i % 4) * 8);
    }
    const bitLen = utf8.length * 8;
    words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
    words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

    let h0 = 0x67452301,
      h1 = 0xefcdab89,
      h2 = 0x98badcfe,
      h3 = 0x10325476,
      h4 = 0xc3d2e1f0;
    const w = new Array(80);
    const rotl = (n, s) => (n << s) | (n >>> (32 - s));

    for (let i = 0; i < words.length; i += 16) {
      for (let j = 0; j < 16; j++) w[j] = words[i + j] | 0;
      for (let j = 16; j < 80; j++)
        w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        e = h4;
      for (let j = 0; j < 80; j++) {
        let f, k;
        if (j < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }

        const temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
        e = d;
        d = c;
        c = rotl(b, 30);
        b = a;
        a = temp;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0;
    }

    return [h0, h1, h2, h3, h4]
      .map((n) => (n >>> 0).toString(16).padStart(8, "0"))
      .join("");
  }

  global.sha1 = sha1;
  global.SmartESS = global.SmartESS || {};
  global.SmartESS.sha1 = sha1;
})(typeof window !== "undefined" ? window : globalThis);
