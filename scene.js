/* =========================================================
   Escena p5.js — ilustraciones de partículas
   Las estrellas y flores viven dibujadas a mano; al pasar el
   mouse se dispersan en partículas luminosas y vuelven a
   formar la ilustración.
   ========================================================= */

(function () {
  "use strict";

  if (typeof window.p5 === "undefined") return;

  var host = document.getElementById("scene");
  if (!host) return;

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var tocarMenos = reduceQuery.matches;

  reduceQuery.addEventListener("change", function (event) {
    tocarMenos = event.matches;
  });

  var TONES = {
    pink: { core: "#fff0f8", mid: "#ffb3dc", deep: "#ff6fba" },
    lilac: { core: "#f4ecff", mid: "#cdb0ff", deep: "#9a72ea" },
    yellow: { core: "#fffbe6", mid: "#ffe4a0", deep: "#ffc95f" },
    sky: { core: "#eefaff", mid: "#aee1ff", deep: "#6fc0f4" },
    cream: { core: "#fffaf3", mid: "#ffe7d6", deep: "#f3c3b1" }
  };

  var DECOR = [
    { type: "star", tone: "pink", x: 0.1, y: 0.22, size: 52, rot: -0.18, small: { x: 0.13, y: 0.15, size: 30 } },
    { type: "flower", tone: "lilac", x: 0.88, y: 0.18, size: 58, rot: 0.32, small: { x: 0.85, y: 0.12, size: 32 } },
    { type: "sparkle", tone: "yellow", x: 0.21, y: 0.55, size: 26, rot: 0.12, small: { x: 0.16, y: 0.44, size: 18 } },
    { type: "flower", tone: "sky", x: 0.06, y: 0.7, size: 42, rot: -0.28, small: { x: 0.08, y: 0.58, size: 24 } },
    { type: "star", tone: "yellow", x: 0.93, y: 0.62, size: 40, rot: 0.55, small: { x: 0.91, y: 0.5, size: 22 } },
    { type: "flower", tone: "pink", x: 0.8, y: 0.84, size: 46, rot: 0.18, small: { x: 0.86, y: 0.92, size: 26 } },
    { type: "sparkle", tone: "sky", x: 0.63, y: 0.1, size: 22, rot: 0, small: false },
    { type: "sparkle", tone: "lilac", x: 0.42, y: 0.9, size: 20, rot: 0.4, small: { x: 0.33, y: 0.95, size: 16 } },
    { type: "star", tone: "cream", x: 0.28, y: 0.96, size: 24, rot: -0.5, small: false }
  ];

  /* ---------- utilidades ---------- */

  function rgba(hex, alpha) {
    var value = hex.replace("#", "");
    var r = parseInt(value.substring(0, 2), 16);
    var g = parseInt(value.substring(2, 4), 16);
    var b = parseInt(value.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function starPolygon(radius, spikes, innerRatio, rotation) {
    var points = [];
    var step = Math.PI / spikes;
    for (var i = 0; i < spikes * 2; i += 1) {
      var r = i % 2 === 0 ? radius : radius * innerRatio;
      var angle = rotation + i * step;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
  }

  function flowerOutline(radius, lobes, steps) {
    var points = [];
    for (var i = 0; i < steps; i += 1) {
      var angle = (i / steps) * Math.PI * 2;
      var lobe = Math.pow(Math.abs(Math.cos((lobes / 2) * angle)), 0.65);
      var r = radius * (0.3 + 0.7 * lobe);
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
  }

  function pointInPolygon(px, py, polygon) {
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      var xi = polygon[i].x;
      var yi = polygon[i].y;
      var xj = polygon[j].x;
      var yj = polygon[j].y;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /* Mezcla puntos del borde con puntos del interior: así la
     silueta queda bien definida y el centro también se llena. */
  function samplePolygon(polygon, count) {
    var points = [];
    var edges = [];
    var total = 0;
    var i;

    for (i = 0; i < polygon.length; i += 1) {
      var a = polygon[i];
      var b = polygon[(i + 1) % polygon.length];
      var length = Math.hypot(b.x - a.x, b.y - a.y);
      edges.push({ a: a, b: b, length: length, start: total });
      total += length;
    }

    var edgeCount = Math.round(count * 0.58);
    for (i = 0; i < edgeCount; i += 1) {
      var pick = Math.random() * total;
      var edge = edges[edges.length - 1];
      for (var e = 0; e < edges.length; e += 1) {
        if (pick <= edges[e].start + edges[e].length) {
          edge = edges[e];
          break;
        }
      }
      var t = Math.min(1, Math.max(0, (pick - edge.start) / (edge.length || 1)));
      var px = edge.a.x + (edge.b.x - edge.a.x) * t;
      var py = edge.a.y + (edge.b.y - edge.a.y) * t;
      var pull = 0.8 + Math.random() * 0.2;
      points.push({ x: px * pull, y: py * pull });
    }

    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;
    for (i = 0; i < polygon.length; i += 1) {
      minX = Math.min(minX, polygon[i].x);
      maxX = Math.max(maxX, polygon[i].x);
      minY = Math.min(minY, polygon[i].y);
      maxY = Math.max(maxY, polygon[i].y);
    }

    var guard = 0;
    var maxGuard = count * 60;
    while (points.length < count && guard < maxGuard) {
      guard += 1;
      var rx = minX + Math.random() * (maxX - minX);
      var ry = minY + Math.random() * (maxY - minY);
      if (pointInPolygon(rx, ry, polygon)) {
        points.push({ x: rx, y: ry });
      }
    }

    return points;
  }

  function sampleFlower(radius, count) {
    var points = [];
    var guard = 0;
    var maxGuard = count * 80;

    while (points.length < count && guard < maxGuard) {
      guard += 1;
      var angle = Math.random() * Math.PI * 2;
      var lobe = Math.pow(Math.abs(Math.cos(2.5 * angle)), 0.65);
      var maxRadius = radius * (0.3 + 0.7 * lobe);
      var r = Math.sqrt(Math.random()) * maxRadius;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }

    return points;
  }

  /* ---------- sketch ---------- */

  new p5(function (p) {
    var decorations = [];
    var sparks = [];
    var pointer = { x: -9999, y: -9999, active: false };
    var hovered = null;
    var smallScreen = false;

    p.setup = function () {
      p.createCanvas(window.innerWidth, window.innerHeight);
      p.pixelDensity(Math.min(2, p.displayDensity()));
      p.frameRate(60);
      p.noStroke();
      buildScene();
      attachPointer();
    };

    function buildScene() {
      smallScreen = window.innerWidth < 700;

      decorations = DECOR.map(function (definition) {
        var spec = smallScreen ? definition.small : definition;
        if (!spec) return null;

        var tone = TONES[definition.tone] || TONES.pink;
        var size = spec.size;
        var decoration = {
          type: definition.type,
          tone: tone,
          x: window.innerWidth * spec.x,
          y: window.innerHeight * spec.y,
          size: size,
          rot: definition.rot || 0,
          seed: Math.random() * 1000,
          state: "shape",
          timer: 0,
          hovered: false,
          shapeAlpha: 1,
          particleAlpha: 0
        };

        decoration.outline =
          definition.type === "flower"
            ? flowerOutline(size, 5, 96)
            : starPolygon(size, definition.type === "sparkle" ? 4 : 5, definition.type === "sparkle" ? 0.26 : 0.44, -Math.PI / 2);

        decoration.targets =
          definition.type === "flower"
            ? sampleFlower(size, Math.round(size * 3.4))
            : samplePolygon(decoration.outline, Math.round(size * 3.4));

        decoration.particles = decoration.targets.map(function (target) {
          return {
            x: decoration.x + target.x,
            y: decoration.y + target.y,
            ox: target.x,
            oy: target.y,
            vx: 0,
            vy: 0,
            size: 1.4 + Math.random() * 2.4,
            color: Math.random() > 0.7 ? tone.core : tone.mid
          };
        });

        return decoration;
      }).filter(Boolean);

      sparks = [];
      var sparkCount = smallScreen ? 20 : 44;
      for (var i = 0; i < sparkCount; i += 1) {
        sparks.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: 0.5 + Math.random() * 1.7,
          speed: 0.05 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          tone: ["pink", "lilac", "yellow", "sky"][i % 4]
        });
      }
    }

    function attachPointer() {
      window.addEventListener(
        "pointermove",
        function (event) {
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          pointer.active = true;
        },
        { passive: true }
      );

      window.addEventListener(
        "pointerdown",
        function (event) {
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          pointer.active = true;

          var target = nearestDecoration(event.clientX, event.clientY, 1.7);
          if (target) {
            burst(target);
            window.setTimeout(function () {
              target.hovered = false;
            }, 2400);
          }
        },
        { passive: true }
      );

      window.addEventListener("pointerleave", function () {
        pointer.active = false;
      });
    }

    function nearestDecoration(x, y, factor) {
      var best = null;
      var bestDistance = Infinity;
      for (var i = 0; i < decorations.length; i += 1) {
        var decoration = decorations[i];
        var distance = Math.hypot(x - decoration.x, y - decoration.y);
        if (distance < Math.max(34, decoration.size * factor) && distance < bestDistance) {
          best = decoration;
          bestDistance = distance;
        }
      }
      return best;
    }

    function burst(decoration) {
      if (decoration.state === "shape" || decoration.state === "fade") {
        for (var i = 0; i < decoration.particles.length; i += 1) {
          var particle = decoration.particles[i];
          var angle = Math.random() * Math.PI * 2;
          var speed = (1.4 + Math.random() * 4.6) * (decoration.size / 46);
          particle.x = decoration.x + particle.ox;
          particle.y = decoration.y + particle.oy;
          particle.vx = Math.cos(angle) * speed;
          particle.vy = Math.sin(angle) * speed - 0.6;
        }
      }
      decoration.state = "burst";
      decoration.timer = 0;
      decoration.hovered = true;
    }

    function trackPointer() {
      var found = null;

      if (pointer.active) {
        for (var i = 0; i < decorations.length; i += 1) {
          var decoration = decorations[i];
          var radius = Math.max(36, decoration.size * 1.05);
          if (Math.hypot(pointer.x - decoration.x, pointer.y - decoration.y) < radius) {
            found = decoration;
            break;
          }
        }
      }

      if (found !== hovered) {
        if (hovered && hovered.state !== "shape") hovered.hovered = false;
        if (found) burst(found);
        hovered = found;
      }
    }

    function updateDecoration(decoration, deltaTime) {
      var dt = Math.min(deltaTime, 48) / 16.667;

      if (decoration.state === "burst") {
        decoration.timer += deltaTime;
        if (decoration.timer > 520) decoration.state = "gather";
      }

      var settled = true;

      for (var i = 0; i < decoration.particles.length; i += 1) {
        var particle = decoration.particles[i];
        var targetX = decoration.x + particle.ox;
        var targetY = decoration.y + particle.oy;

        if (decoration.state === "burst") {
          particle.vx *= Math.pow(0.94, dt);
          particle.vy *= Math.pow(0.94, dt);

          var curl = (p.noise(particle.x * 0.004, particle.y * 0.004, p.frameCount * 0.005) - 0.5) * 0.9;
          var angle = Math.atan2(particle.vy, particle.vx) + curl * dt;
          var speed = Math.hypot(particle.vx, particle.vy);

          particle.vx = Math.cos(angle) * speed;
          particle.vy = Math.sin(angle) * speed + 0.03;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
        } else if (decoration.state !== "shape") {
          particle.vx = (particle.vx + (targetX - particle.x) * 0.085 * dt) * Math.pow(0.82, dt);
          particle.vy = (particle.vy + (targetY - particle.y) * 0.085 * dt) * Math.pow(0.82, dt);
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;

          if (Math.hypot(targetX - particle.x, targetY - particle.y) > 1.4) settled = false;
        }
      }

      if (decoration.state === "gather" && settled) {
        decoration.state = decoration.hovered ? "hold" : "fade";
      }
      if (decoration.state === "hold" && !decoration.hovered) {
        decoration.state = "fade";
      }

      var shapeTarget = decoration.state === "shape" || decoration.state === "fade" ? 1 : 0;
      var particleTarget = decoration.state === "fade" || decoration.state === "shape" ? 0 : 1;

      decoration.shapeAlpha += (shapeTarget - decoration.shapeAlpha) * 0.1 * dt;
      decoration.particleAlpha += (particleTarget - decoration.particleAlpha) * 0.12 * dt;

      if (decoration.state === "fade" && decoration.particleAlpha < 0.02) {
        decoration.particleAlpha = 0;
        decoration.state = "shape";
      }
    }

    function beginPolygon(points) {
      p.beginShape();
      for (var i = 0; i < points.length; i += 1) {
        p.vertex(points[i].x, points[i].y);
      }
      p.endShape(p.CLOSE);
    }

    function drawSolid(decoration) {
      if (decoration.shapeAlpha < 0.01) return;

      var wobble = decoration.size * 0.03;
      var time = p.frameCount * 0.006 + decoration.seed;
      var context = p.drawingContext;
      var shape = [];

      for (var i = 0; i < decoration.outline.length; i += 1) {
        var point = decoration.outline[i];
        var nx = (p.noise(i * 0.11, time) - 0.5) * wobble;
        var ny = (p.noise(i * 0.11 + 30, time) - 0.5) * wobble;
        shape.push({ x: point.x + nx, y: point.y + ny });
      }

      var alpha = decoration.shapeAlpha;

      context.save();
      p.push();
      p.translate(decoration.x, decoration.y);
      p.rotate(decoration.rot);

      context.shadowBlur = decoration.size * 0.6;
      context.shadowColor = rgba(decoration.tone.deep, 0.7 * alpha);
      p.fill(rgba(decoration.tone.mid, 0.95 * alpha));
      beginPolygon(shape);

      context.shadowBlur = 0;
      p.noFill();
      p.stroke(rgba(decoration.tone.core, 0.85 * alpha));
      p.strokeWeight(Math.max(1.1, decoration.size * 0.028));
      beginPolygon(shape);

      p.noStroke();
      p.fill(rgba(decoration.tone.core, 0.18 * alpha));
      p.beginShape();
      for (var j = 0; j < shape.length; j += 1) {
        p.vertex(shape[j].x * 0.5, shape[j].y * 0.5);
      }
      p.endShape(p.CLOSE);

      p.pop();
      context.restore();
    }

    function drawParticles(decoration) {
      if (decoration.particleAlpha < 0.01) return;

      var context = p.drawingContext;

      p.push();
      p.blendMode(p.ADD);
      p.noStroke();

      // Halo suave: la ilustración reformada vuelve a brillar.
      if (decoration.state === "hold" || decoration.state === "gather") {
        context.save();
        context.shadowBlur = decoration.size * 0.9;
        context.shadowColor = rgba(decoration.tone.deep, 0.4 * decoration.particleAlpha);
        p.fill(rgba(decoration.tone.deep, 0.14 * decoration.particleAlpha));
        p.ellipse(decoration.x, decoration.y, decoration.size * 1.15, decoration.size * 1.15);
        context.restore();
      }

      for (var i = 0; i < decoration.particles.length; i += 1) {
        var particle = decoration.particles[i];
        var shimmer =
          decoration.state === "hold"
            ? (p.noise(particle.ox * 0.03 + decoration.seed, p.frameCount * 0.02) - 0.5) * 2.4
            : 0;
        var x = particle.x + shimmer;
        var y = particle.y + shimmer;

        p.fill(rgba(particle.color, 0.14 * decoration.particleAlpha));
        p.circle(x, y, particle.size * 4.2);
        p.fill(rgba(particle.color, 0.7 * decoration.particleAlpha));
        p.circle(x, y, particle.size);
      }

      p.blendMode(p.BLEND);
      p.pop();
    }

    function drawSparks() {
      p.push();
      p.blendMode(p.ADD);
      p.noStroke();

      for (var i = 0; i < sparks.length; i += 1) {
        var spark = sparks[i];
        spark.y -= spark.speed;

        if (spark.y < -12) {
          spark.y = window.innerHeight + 12;
          spark.x = Math.random() * window.innerWidth;
        }

        var twinkle = 0.35 + 0.65 * Math.abs(Math.sin(p.frameCount * 0.012 + spark.phase));
        var tone = TONES[spark.tone];
        var x = spark.x + Math.sin(p.frameCount * 0.004 + spark.phase) * 10;

        p.fill(rgba(tone.mid, 0.1 * twinkle));
        p.circle(x, spark.y, spark.radius * 6);
        p.fill(rgba(tone.core, 0.55 * twinkle));
        p.circle(x, spark.y, spark.radius);
      }

      p.blendMode(p.BLEND);
      p.pop();
    }

    p.draw = function () {
      p.clear();
      trackPointer();

      if (tocarMenos) {
        for (var i = 0; i < decorations.length; i += 1) {
          decorations[i].shapeAlpha = 1;
          decorations[i].particleAlpha = 0;
          drawSolid(decorations[i]);
        }
        return;
      }

      drawSparks();

      for (var j = 0; j < decorations.length; j += 1) {
        updateDecoration(decorations[j], p.deltaTime);
      }

      for (var k = 0; k < decorations.length; k += 1) {
        drawSolid(decorations[k]);
      }

      for (var m = 0; m < decorations.length; m += 1) {
        drawParticles(decorations[m]);
      }
    };

    p.windowResized = function () {
      p.resizeCanvas(window.innerWidth, window.innerHeight);
      buildScene();
      hovered = null;
      pointer.active = false;
    };
  }, host);
})();
