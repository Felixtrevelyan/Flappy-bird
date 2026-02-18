(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const WORLD_WIDTH = canvas.width;
  const WORLD_HEIGHT = canvas.height;
  const GROUND_HEIGHT = 120;

  const STATE_READY = "ready";
  const STATE_PLAYING = "playing";
  const STATE_GAME_OVER = "gameover";

  const gravity = 1500;
  const flapVelocity = -430;
  const maxFallSpeed = 700;
  const pipeWidth = 88;
  const pipeGap = 185;
  const pipeSpeed = 190;
  const pipeSpacing = 250;
  const pipeStartOffset = 260;
  const minTopHeight = 60;
  const minBottomHeight = 60;
  const minGapY = minTopHeight + pipeGap / 2;
  const maxGapY = WORLD_HEIGHT - GROUND_HEIGHT - minBottomHeight - pipeGap / 2;

  let state = STATE_READY;
  let lastTime = 0;
  let score = 0;
  let best = Number.parseInt(localStorage.getItem("flappy-best") || "0", 10);

  const bird = {
    x: 140,
    y: 300,
    radius: 20,
    vy: 0,
    rotation: 0,
    wingTick: 0,
  };

  const camera = {
    groundOffset: 0,
    cloudOffset: 0,
  };

  /** @type {Array<{x:number, gapY:number, passed:boolean}>} */
  const pipes = [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomGapY() {
    return minGapY + Math.random() * (maxGapY - minGapY);
  }

  function resetRound() {
    state = STATE_READY;
    bird.x = 140;
    bird.y = 300;
    bird.vy = 0;
    bird.rotation = 0;
    bird.wingTick = 0;
    score = 0;
    pipes.length = 0;
    for (let i = 0; i < 3; i += 1) {
      spawnPipe(WORLD_WIDTH + pipeStartOffset + i * pipeSpacing);
    }
  }

  function startRound() {
    if (state === STATE_READY) {
      state = STATE_PLAYING;
      flap();
    }
  }

  function flap() {
    bird.vy = flapVelocity;
    bird.wingTick = 0.1;
  }

  function onActionInput() {
    if (state === STATE_READY) {
      startRound();
      return;
    }
    if (state === STATE_PLAYING) {
      flap();
      return;
    }
    resetRound();
  }

  function updateBird(dt) {
    if (state === STATE_READY) {
      bird.wingTick += dt * 8;
      bird.y = 300 + Math.sin(performance.now() / 220) * 10;
      bird.rotation = Math.sin(performance.now() / 250) * 0.08;
      return;
    }

    bird.vy = clamp(bird.vy + gravity * dt, -1000, maxFallSpeed);
    bird.y += bird.vy * dt;
    bird.wingTick += dt * 16;
    bird.rotation = clamp((bird.vy / maxFallSpeed) * 1.2, -0.55, 1.2);

    const floor = WORLD_HEIGHT - GROUND_HEIGHT - bird.radius;
    if (bird.y > floor) {
      bird.y = floor;
      bird.vy = 0;
      bird.rotation = 1.2;
    }
  }

  function updateWorld(dt) {
    camera.groundOffset = (camera.groundOffset + pipeSpeed * dt) % 48;
    camera.cloudOffset = (camera.cloudOffset + pipeSpeed * 0.15 * dt) % WORLD_WIDTH;
  }

  function spawnPipe(x) {
    pipes.push({
      x,
      gapY: randomGapY(),
      passed: false,
    });
  }

  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const nearestX = clamp(cx, rx, rx + rw);
    const nearestY = clamp(cy, ry, ry + rh);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= cr * cr;
  }

  function updatePipes(dt) {
    if (state !== STATE_PLAYING) {
      return;
    }

    for (const pipe of pipes) {
      pipe.x -= pipeSpeed * dt;

      if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
        pipe.passed = true;
        score += 1;
        if (score > best) {
          best = score;
          localStorage.setItem("flappy-best", String(best));
        }
      }
    }

    while (pipes.length && pipes[0].x + pipeWidth < -20) {
      pipes.shift();
    }

    let rightMostX = pipes.length
      ? pipes[pipes.length - 1].x
      : WORLD_WIDTH + pipeStartOffset - pipeSpacing;
    while (rightMostX <= WORLD_WIDTH + pipeStartOffset) {
      rightMostX += pipeSpacing;
      spawnPipe(rightMostX);
    }
  }

  function checkCollisions() {
    if (state !== STATE_PLAYING) {
      return;
    }

    if (bird.y - bird.radius <= 0) {
      bird.y = bird.radius;
      bird.vy = 80;
    }

    const floor = WORLD_HEIGHT - GROUND_HEIGHT;
    if (bird.y + bird.radius >= floor) {
      bird.y = floor - bird.radius;
      endRound();
      return;
    }

    for (const pipe of pipes) {
      const topHeight = pipe.gapY - pipeGap / 2;
      const bottomY = pipe.gapY + pipeGap / 2;
      const bottomHeight = floor - bottomY;

      const hitTop = circleRectCollide(
        bird.x,
        bird.y,
        bird.radius - 2,
        pipe.x,
        0,
        pipeWidth,
        topHeight
      );
      const hitBottom = circleRectCollide(
        bird.x,
        bird.y,
        bird.radius - 2,
        pipe.x,
        bottomY,
        pipeWidth,
        bottomHeight
      );

      if (hitTop || hitBottom) {
        endRound();
        return;
      }
    }
  }

  function endRound() {
    if (state !== STATE_PLAYING) {
      return;
    }
    state = STATE_GAME_OVER;
    bird.vy = 0;
    bird.rotation = 1.2;
  }

  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, "#5fd3ff");
    gradient.addColorStop(0.65, "#8fe5ff");
    gradient.addColorStop(1, "#d3f7ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const cloudX = -camera.cloudOffset;
    for (let i = 0; i < 7; i += 1) {
      const x = cloudX + i * 170;
      const y = 90 + (i % 3) * 44;
      drawCloud(x, y, 1 + (i % 2) * 0.25);
    }
  }

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.arc(x, y, 16 * scale, 0, Math.PI * 2);
    ctx.arc(x + 18 * scale, y - 8 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 40 * scale, y, 17 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    const floor = WORLD_HEIGHT - GROUND_HEIGHT;

    for (const pipe of pipes) {
      const topHeight = pipe.gapY - pipeGap / 2;
      const bottomY = pipe.gapY + pipeGap / 2;
      const bottomHeight = floor - bottomY;

      drawPipeSegment(pipe.x, 0, pipeWidth, topHeight, true);
      drawPipeSegment(pipe.x, bottomY, pipeWidth, bottomHeight, false);
    }
  }

  function drawPipeSegment(x, y, width, height, capAtBottom) {
    if (height <= 0) {
      return;
    }

    const capHeight = 28;
    const bodyTop = capAtBottom ? y : y + capHeight;
    const bodyHeight = height - capHeight;

    if (bodyHeight > 0) {
      ctx.fillStyle = "#61c138";
      ctx.fillRect(x, bodyTop, width, bodyHeight);

      ctx.fillStyle = "#84df4f";
      ctx.fillRect(x + 6, bodyTop + 6, width - 12, Math.max(0, bodyHeight - 12));
    }

    const capY = capAtBottom ? y + height - capHeight : y;
    ctx.fillStyle = "#67ca3b";
    ctx.fillRect(x - 6, capY, width + 12, capHeight);
    ctx.fillStyle = "#90ea5d";
    ctx.fillRect(x, capY + 5, width, capHeight - 9);

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 6, capY, width + 12, capHeight);
  }

  function drawGround() {
    const floorY = WORLD_HEIGHT - GROUND_HEIGHT;

    ctx.fillStyle = "#cda05a";
    ctx.fillRect(0, floorY, WORLD_WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = "#e6c177";
    ctx.fillRect(0, floorY, WORLD_WIDTH, 22);

    for (let i = -1; i <= Math.ceil(WORLD_WIDTH / 48) + 1; i += 1) {
      const x = i * 48 - camera.groundOffset;
      ctx.fillStyle = i % 2 ? "#d6ab62" : "#c9984d";
      ctx.fillRect(x, floorY + 22, 48, 24);

      ctx.fillStyle = "rgba(95, 62, 26, 0.2)";
      ctx.fillRect(x, floorY + 46, 48, 2);
    }

    ctx.fillStyle = "#b77a35";
    ctx.fillRect(0, WORLD_HEIGHT - 12, WORLD_WIDTH, 12);
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    const wingOffset = Math.sin(bird.wingTick) * 10;

    ctx.fillStyle = "#f7cb21";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e4b71a";
    ctx.beginPath();
    ctx.ellipse(-2, 7, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe46a";
    ctx.beginPath();
    ctx.ellipse(-5, -3, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#efb22c";
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(28, 9);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd533";
    ctx.beginPath();
    ctx.ellipse(-7, wingOffset * 0.3 + 2, 11, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(8, -5, 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawScore() {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 7;
    ctx.font = "bold 60px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(String(score), WORLD_WIDTH / 2, 110);
    ctx.fillText(String(score), WORLD_WIDTH / 2, 110);
    ctx.restore();
  }

  function drawReadyOverlay() {
    drawText("GET READY", WORLD_WIDTH / 2, 260, 40);
    drawText("Press Space / Tap", WORLD_WIDTH / 2, 308, 24);
  }

  function drawGameOverOverlay() {
    drawCenteredPanel(130, 120, 340, 260);
    drawText("GAME OVER", WORLD_WIDTH / 2, 212, 44);
    drawText(`SCORE  ${score}`, WORLD_WIDTH / 2, 272, 28);
    drawText(`BEST   ${best}`, WORLD_WIDTH / 2, 314, 28);
    drawText("Press Space / Tap to restart", WORLD_WIDTH / 2, 360, 20);
  }

  function drawCenteredPanel(x, y, w, h) {
    ctx.fillStyle = "rgba(253, 248, 222, 0.95)";
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
  }

  function drawText(text, x, y, size) {
    ctx.save();
    ctx.font = `bold ${size}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.fillStyle = "#ffffff";
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function draw() {
    drawSky();
    drawPipes();
    drawGround();
    drawBird();
    drawScore();

    if (state === STATE_READY) {
      drawReadyOverlay();
    } else if (state === STATE_GAME_OVER) {
      drawGameOverOverlay();
    }
  }

  function update(dt) {
    updateWorld(dt);
    updateBird(dt);
    updatePipes(dt);
    checkCollisions();
  }

  function tick(timestamp) {
    if (!lastTime) {
      lastTime = timestamp;
    }
    const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(tick);
  }

  function bindInputs() {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        onActionInput();
      }
    });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      onActionInput();
    });
  }

  bindInputs();
  resetRound();
  requestAnimationFrame(tick);
})();
