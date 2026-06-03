function isPointInPolygon(point, polygonCoords) {
  const x = point[1],
    y = point[0]; // x = lng, y = lat
  let inside = false;

  for (let i = 0; i < polygonCoords.length - 1; i++) {
    const xi = polygonCoords[i][0],
      yi = polygonCoords[i][1];
    const xj = polygonCoords[i + 1][0],
      yj = polygonCoords[i + 1][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isLeft(P0, P1, P2) {
  return (P1[0] - P0[0]) * (P2[1] - P0[1]) - (P2[0] - P0[0]) * (P1[1] - P0[1]);
}

function intersects(A, B, C, D) {
  // [lat, lng] -> [x, y]
  const p1 = [A[1], A[0]],
    p2 = [B[1], B[0]],
    p3 = [C[1], C[0]],
    p4 = [D[1], D[0]];

  const d1 = isLeft(p3, p4, p1);
  const d2 = isLeft(p3, p4, p2);
  const d3 = isLeft(p1, p2, p3);
  const d4 = isLeft(p1, p2, p4);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

// Відстань у градусах
const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
};

function findSafeRoute(start, end, nfzZones) {
  const nfzEdges = [];
  const transitNodes = [];

  nfzZones.forEach((zone) => {
    const coords = zone.polygon.coordinates[0];
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = [coords[i][1], coords[i][0]];
      const p2 = [coords[i + 1][1], coords[i + 1][0]];
      nfzEdges.push({ p1, p2 });

      const BUFFER = 0.001; // ~111m
      const centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;

      const offsetLat = p1[0] + (p1[0] - centerLat > 0 ? BUFFER : -BUFFER);
      const offsetLng = p1[1] + (p1[1] - centerLng > 0 ? BUFFER : -BUFFER);
      transitNodes.push([offsetLat, offsetLng]);
    }
  });

  let directLineIntersects = false;
  for (const edge of nfzEdges) {
    if (intersects(start, end, edge.p1, edge.p2)) {
      directLineIntersects = true;
      break;
    }
  }

  if (!directLineIntersects) {
    return [start, end];
  }

  // Visibility Graph
  const allNodes = [start, ...transitNodes, end];
  const graph = Array(allNodes.length)
    .fill(null)
    .map(() => []);

  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      let segmentIntersects = false;
      for (const edge of nfzEdges) {
        if (intersects(allNodes[i], allNodes[j], edge.p1, edge.p2)) {
          segmentIntersects = true;
          break;
        }
      }

      if (!segmentIntersects) {
        const dist = getDistance(allNodes[i], allNodes[j]);
        graph[i].push({ to: j, weight: dist });
        graph[j].push({ to: i, weight: dist });
      }
    }
  }

  // Dijkstra
  const startIndex = 0;
  const endIndex = allNodes.length - 1;

  const distances = Array(allNodes.length).fill(Infinity);
  const parent = Array(allNodes.length).fill(-1);
  const visited = Array(allNodes.length).fill(false);

  distances[startIndex] = 0;

  for (let i = 0; i < allNodes.length; i++) {
    let u = -1;
    for (let j = 0; j < allNodes.length; j++) {
      if (!visited[j] && (u === -1 || distances[j] < distances[u])) {
        u = j;
      }
    }

    if (distances[u] === Infinity || u === endIndex) break;
    visited[u] = true;

    for (const edge of graph[u]) {
      const v = edge.to;
      const weight = edge.weight;
      if (distances[u] + weight < distances[v]) {
        distances[v] = distances[u] + weight;
        parent[v] = u;
      }
    }
  }

  // Fallback: якщо граф заблокований, повертаємо пряму лінію
  if (distances[endIndex] === Infinity) {
    return [start, end];
  }

  const path = [];
  let curr = endIndex;
  while (curr !== -1) {
    path.push(allNodes[curr]);
    curr = parent[curr];
  }

  return path.reverse();
}

module.exports = { findSafeRoute, isPointInPolygon };
