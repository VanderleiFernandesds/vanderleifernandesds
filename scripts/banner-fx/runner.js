// Versão sem React do efeito, com tempo controlado (para gravar quadro a quadro).
function initFx(canvas, opts) {
  const s = {
    colors: opts.colors || DEFAULT_COLORS,
    shape: SHAPES[opts.shape || 'horizon'],
    characters: opts.characters || DEFAULT_CHARACTERS,
    cellSize: opts.cellSize ?? 18,
    density: opts.density ?? 0.8,
    glyphOpacity: opts.glyphOpacity ?? 0.85,
    glow: opts.glow ?? 0.2,
    depthOfField: 0,
    flicker: opts.flicker ?? 0.2,
    softness: opts.softness ?? 0.5,
    scale: opts.scale ?? 1,
    flow: opts.flow ?? 0.5,
    gradientOpacity: opts.gradientOpacity ?? 0.9,
    grain: opts.grain ?? 0.08,
    variation: opts.variation ?? 0,
    scrambleRadius: 0.1,
    clickEffect: 0,
    lightMode: false,
    fontFamily: opts.fontFamily || DEFAULT_FONT,
  };
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('sem webgl2');
  const field = link(gl, FIELD), halo = link(gl, HALO), blur = link(gl, BLUR), composite = link(gl, COMPOSITE);
  if (!field || !halo || !blur || !composite) throw new Error('shader falhou');
  const vao = gl.createVertexArray();
  const fieldTarget = createTarget(gl, 2), haloA = createTarget(gl, 1), haloB = createTarget(gl, 1);
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const parse = (key) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = key; probe.fillRect(0, 0, 1, 1); const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; return [r / 255, g / 255, b / 255]; };
  const ramp = new Float32Array(MAX_COLORS * 3);
  s.colors.forEach((c, i) => ramp.set(toLab(parse(c)), i * 3));
  const trailData = new Float32Array(MAX_TRAIL * 4), clickData = new Float32Array(MAX_CLICKS * 4);
  const view = { width: canvas.width, height: canvas.height, ratio: 1 };
  let atlas = buildAtlas(gl, s.characters, s.fontFamily);
  let time = 0, glyphTime = 0, frameSeed = 0;

  sizeTarget(gl, fieldTarget, Math.round(canvas.width / 2), Math.round(canvas.height / 2));
  sizeTarget(gl, haloA, Math.round(canvas.width / 4), Math.round(canvas.height / 4));
  sizeTarget(gl, haloB, Math.round(canvas.width / 4), Math.round(canvas.height / 4));

  const bindGlyphs = (program, width, height) => {
    const u = program.uniforms;
    const cellH = s.cellSize * view.ratio, cellW = cellH * (ATLAS_CELL_W / ATLAS_CELL_H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[0]); gl.uniform1i(u.uField, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[1]); gl.uniform1i(u.uAux, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, atlas.texture); gl.uniform1i(u.uAtlas, 2);
    gl.uniform2f(u.uResolution, width, height);
    gl.uniform2f(u.uCell, cellW, cellH);
    gl.uniform2f(u.uOffset, (width - Math.ceil(width / cellW) * cellW) / 2, (height - Math.ceil(height / cellH) * cellH) / 2);
    gl.uniform2f(u.uAtlasGrid, atlas.grid[0], atlas.grid[1]);
    gl.uniform1f(u.uCount, atlas.count);
    gl.uniform1f(u.uDensity, s.density);
    gl.uniform1f(u.uOpacity, s.glyphOpacity);
    gl.uniform1f(u.uFlicker, s.flicker);
    gl.uniform1f(u.uDepth, s.depthOfField);
    gl.uniform1f(u.uGlyphTime, glyphTime);
    gl.uniform1f(u.uSeedValue, s.variation);
    gl.uniform1f(u.uLight, 0);
  };

  const draw = () => {
    const aspect = view.width / view.height;
    gl.bindVertexArray(vao); gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTarget.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, fieldTarget.width, fieldTarget.height);
    gl.useProgram(field.program);
    const fu = field.uniforms;
    gl.uniform1f(fu.uAspect, aspect); gl.uniform1f(fu.uTime, time); gl.uniform1i(fu.uShape, s.shape);
    gl.uniform3fv(fu.uRamp, ramp); gl.uniform1i(fu.uCount, s.colors.length);
    gl.uniform1f(fu.uScale, s.scale); gl.uniform1f(fu.uSoftness, s.softness); gl.uniform1f(fu.uFlow, s.flow);
    gl.uniform2f(fu.uSeed, s.variation * 3.17, s.variation * 1.91);
    gl.uniform4fv(fu.uTrail, trailData); gl.uniform1f(fu.uRadius, s.scrambleRadius);
    gl.uniform4fv(fu.uClicks, clickData); gl.uniform1i(fu.uClickEffect, 0);
    gl.uniform1f(fu.uIntro, 1); gl.uniform1f(fu.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, haloA.width, haloA.height);
    gl.useProgram(halo.program); bindGlyphs(halo, canvas.width, canvas.height);
    gl.uniform1f(halo.uniforms.uDownscale, canvas.width / haloA.width);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(blur.program); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(blur.uniforms.uSource, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloB.framebuffer); gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 1 / haloA.width, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer); gl.bindTexture(gl.TEXTURE_2D, haloB.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 0, 1 / haloA.height); gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.program); bindGlyphs(composite, canvas.width, canvas.height);
    const cu = composite.uniforms;
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]); gl.uniform1i(cu.uHalo, 3);
    gl.uniform1f(cu.uGlow, s.glow); gl.uniform1f(cu.uGradient, s.gradientOpacity);
    gl.uniform1f(cu.uGrain, s.grain); gl.uniform1f(cu.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  };

  // t em segundos de relógio (mesma escala do componente com speed = 1)
  return {
    renderAt(t) { time = t * 0.5; glyphTime = t; frameSeed = Math.floor(t * 24) % 97; draw(); },
    rebuildAtlas() { atlas = buildAtlas(gl, s.characters, s.fontFamily); },
  };
}
