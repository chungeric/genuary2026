import p5 from 'p5';

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.background(0);
  };

  p.draw = () => {
    p.background(0);
    p.fill(255, 100, 200);
    p.ellipse(p.width/2 + Math.sin(p.frameCount * 0.02) * 100, p.height/2, 100, 100);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);