// Animated illustrations intentionally never become actionability-stable.
// Scroll their stationary scene, then use real pointer/touch coordinates.
export async function pointInScene(target, x = 60, y = 100) {
  await target.locator("..").scrollIntoViewIfNeeded();
  await target.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished));
  });
  const bounds = await target.boundingBox();
  return { x: bounds.x + Math.min(x, bounds.width / 2), y: bounds.y + Math.min(y, bounds.height / 2) };
}
