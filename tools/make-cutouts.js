const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPng(file) {
  const input = fs.readFileSync(file);
  if (!input.subarray(0, 8).equals(PNG_SIG)) throw new Error(`${file} is not a PNG`);

  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (pos < input.length) {
    const length = input.readUInt32BE(pos);
    const type = input.toString('ascii', pos + 4, pos + 8);
    const data = input.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error(`${file} uses unsupported PNG settings`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`${file} has unsupported PNG color type ${colorType}`);

  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  let src = 0;
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    const line = Buffer.from(raw.subarray(src, src + stride));
    src += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= channels ? prev[x - channels] : 0;
      if (filter === 1) line[x] = (line[x] + left) & 255;
      if (filter === 2) line[x] = (line[x] + up) & 255;
      if (filter === 3) line[x] = (line[x] + Math.floor((left + up) / 2)) & 255;
      if (filter === 4) line[x] = (line[x] + paeth(left, up, upLeft)) & 255;
    }

    for (let x = 0; x < width; x += 1) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      pixels[di] = line[si];
      pixels[di + 1] = line[si + 1];
      pixels[di + 2] = line[si + 2];
      pixels[di + 3] = channels === 4 ? line[si + 3] : 255;
    }
    prev = line;
  }

  return { width, height, pixels };
}

function writePng(file, image) {
  const { width, height, pixels } = image;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  fs.writeFileSync(file, Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function borderColor(image) {
  const { width, height, pixels } = image;
  const samples = [[], [], []];
  const push = (x, y) => {
    const i = (y * width + x) * 4;
    samples[0].push(pixels[i]);
    samples[1].push(pixels[i + 1]);
    samples[2].push(pixels[i + 2]);
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 80))) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 80))) {
    push(0, y);
    push(width - 1, y);
  }
  return [median(samples[0]), median(samples[1]), median(samples[2])];
}

function isBgLike(rgb, bg, options) {
  const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const saturation = Math.max(...rgb) - Math.min(...rgb);
  if (options.checkerboard) {
    return saturation < 18 && brightness > 172;
  }
  return colorDistance(rgb, bg) < options.flood;
}

function connectedBackground(image, bg, options) {
  const { width, height, pixels } = image;
  const mask = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (mask[p]) return;
    const i = p * 4;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    if (!isBgLike(rgb, bg, options)) return;
    mask[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let q = 0; q < queue.length; q += 1) {
    const p = queue[q];
    const x = p % width;
    const y = Math.floor(p / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return mask;
}

function makeCutout(src, dest, options) {
  const image = readPng(src);
  const { width, height, pixels } = image;
  const bg = options.background || borderColor(image);
  const hard = options.hard;
  const soft = options.soft;
  const protectBright = options.protectBright || 255;
  const connected = options.flood ? connectedBackground(image, bg, options) : null;

  for (let p = 0; p < width * height; p += 1) {
    const i = p * 4;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const diff = colorDistance(rgb, bg);
    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
    let alpha = pixels[i + 3];

    if (brightness < protectBright) {
      if (diff <= hard) alpha = 0;
      else if (diff < soft) alpha = Math.round(255 * ((diff - hard) / (soft - hard)));
    }

    pixels[i + 3] = Math.min(alpha, pixels[i + 3]);
  }

  if (connected) {
    for (let p = 0; p < width * height; p += 1) {
      if (!connected[p]) continue;
      pixels[p * 4 + 3] = 0;
    }
  }

  if (options.erase) {
    for (const box of options.erase) {
      for (let y = box.y; y < Math.min(height, box.y + box.h); y += 1) {
        for (let x = box.x; x < Math.min(width, box.x + box.w); x += 1) {
          pixels[(y * width + x) * 4 + 3] = 0;
        }
      }
    }
  }

  writePng(dest, image);
  console.log(`Created ${path.relative(process.cwd(), dest)}`);
}

const img = path.join(process.cwd(), 'img');
makeCutout(
  path.join(img, 'glass-of-milk.png'),
  path.join(img, 'glass-of-milk-cutout.png'),
  {
    hard: 28,
    soft: 110,
    flood: 118,
    protectBright: 256,
    erase: [{ x: 820, y: 960, w: 124, h: 155 }],
  },
);
makeCutout(
  path.join(img, 'packed-ghee.png'),
  path.join(img, 'packed-ghee-cutout.png'),
  {
    background: [222, 222, 222],
    hard: 35,
    soft: 92,
    flood: 120,
    checkerboard: true,
    protectBright: 256,
    erase: [{ x: 890, y: 915, w: 134, h: 109 }],
  },
);
