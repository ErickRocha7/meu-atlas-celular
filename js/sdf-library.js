// Primitivas SDF e operadores booleanos suaves

export function sdSphere(p, radius) {
    return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) - radius;
}

export function sdCapsule(p, radius, halfHeight) {
    const clampedY = Math.max(-halfHeight, Math.min(p.y, halfHeight));
    const dx = p.x;
    const dy = p.y - clampedY;
    const dz = p.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - radius;
}

export function sdBox(p, halfSize) {
    const qx = Math.abs(p.x) - halfSize.x;
    const qy = Math.abs(p.y) - halfSize.y;
    const qz = Math.abs(p.z) - halfSize.z;
    return Math.min(Math.max(qx, Math.max(qy, qz)), 0) +
           Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2);
}

export function sdTorus(p, radius, tubeRadius) {
    const qx = Math.sqrt(p.x * p.x + p.z * p.z) - radius;
    return Math.sqrt(qx * qx + p.y * p.y) - tubeRadius;
}

export function opSmoothUnion(d1, d2, k) {
    const h = Math.max(k - Math.abs(d1 - d2), 0);
    return Math.min(d1, d2) - h * h * 0.25 / k;
}

export function opSmoothSubtraction(d1, d2, k) {
    return -opSmoothUnion(-d1, d2, k);
}

export function opSmoothIntersection(d1, d2, k) {
    return -opSmoothUnion(-d1, -d2, k);
}

export function simpleNoise3D(x, y, z) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
}

export function noiseVector(p, amplitude) {
    const nx = simpleNoise3D(p.x + 1.0, p.y, p.z) * amplitude;
    const ny = simpleNoise3D(p.x, p.y + 2.0, p.z) * amplitude;
    const nz = simpleNoise3D(p.x, p.y, p.z + 3.0) * amplitude;
    return { x: nx, y: ny, z: nz };
}

export function domainWarp(p, warpFunc) {
    const warp = warpFunc(p);
    return {
        x: p.x + warp.x,
        y: p.y + warp.y,
        z: p.z + warp.z
    };
}