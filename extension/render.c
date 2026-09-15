/* Standalone ASCII torus renderer. Browser preview uses the same projection.
   Build: cc render.c -O2 -lm -o render
   Run one frame: ./render 0
   Animate: ./render
   Stop the animation with Ctrl+C. */
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static void render(double a, double b) {
  enum { WIDTH = 64, HEIGHT = 24 };
  char pixels[WIDTH * HEIGHT];
  double depth[WIDTH * HEIGHT] = {0};
  const char *shades = ".,-~:;=!*#$@";
  for (int i = 0; i < WIDTH * HEIGHT; ++i) pixels[i] = ' ';
  double ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
  for (double u = 0; u < 6.283185307179586; u += .075) {
    double cu = cos(u), su = sin(u);
    for (double v = 0; v < 6.283185307179586; v += .11) {
      double cv = cos(v), sv = sin(v), radius = 1.6 + .6 * cv;
      double x = radius * cu, y = radius * su, z = .6 * sv;
      double y1 = y * ca - z * sa, z1 = y * sa + z * ca;
      double x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
      double inverse = 1 / (z2 + 6);
      int col = (int)floor(WIDTH / 2 + 44 * x2 * inverse);
      int row = (int)floor(HEIGHT / 2 - 22 * y1 * inverse);
      if (col < 0 || col >= WIDTH || row < 0 || row >= HEIGHT) continue;
      int index = row * WIDTH + col;
      if (inverse <= depth[index]) continue;
      depth[index] = inverse;
      double ny = su * cv * ca - sv * sa;
      double nz = -cu * cv * sb + (su * cv * sa + sv * ca) * cb;
      double light = fmax(0, fmin(1, .3 + .45 * ny - .5 * nz));
      pixels[index] = shades[(int)floor(light * 11)];
    }
  }
  for (int row = 0; row < HEIGHT; ++row) {
    fwrite(pixels + row * WIDTH, 1, WIDTH, stdout);
    putchar('\n');
  }
}

int main(int argc, char **argv) {
  if (argc > 1) {
    double t = strtod(argv[1], NULL);
    render(.6 + t * .52, t * .31);
    return 0;
  }
  const struct timespec interval = {0, 83333333};
  for (int frame = 0; frame < 360; ++frame) {
    double t = frame / 12.0;
    printf("\033[H\033[2J");
    render(.6 + t * .52, t * .31);
    fflush(stdout);
    nanosleep(&interval, NULL);
  }
  return 0;
}
