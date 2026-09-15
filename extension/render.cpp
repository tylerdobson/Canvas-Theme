// render.cpp -- Unova terminal / a study in light and motion
// Build: c++ -std=c++17 -O2 render.cpp -o render
// Run: ./render        Single frame: ./render 0
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <iostream>
#include <string>
#include <thread>

namespace unova {
constexpr int width = 64;
constexpr int height = 24;
constexpr double tau = 6.283185307179586;
constexpr double fps = 12.0;
constexpr char shades[] = ".,-~:;=!*#$@";

class AsciiRenderer {
    std::array<char, width * height> pixels{};
    std::array<double, width * height> depth{};

public:
    std::string render(double a, double b) {
        pixels.fill(' ');
        depth.fill(0.0);
        const double ca = std::cos(a), sa = std::sin(a);
        const double cb = std::cos(b), sb = std::sin(b);

        // Sample the surface of a torus in two angles.
        for (double u = 0; u < tau; u += .075) {
            const double cu = std::cos(u), su = std::sin(u);
            for (double v = 0; v < tau; v += .11) {
                const double cv = std::cos(v), sv = std::sin(v);
                const double radius = 1.6 + .6 * cv;
                const double x = radius * cu, y = radius * su;
                const double z = .6 * sv;

                // Rotate around X, then Y; project to the screen.
                const double y1 = y * ca - z * sa;
                const double z1 = y * sa + z * ca;
                const double x2 = x * cb + z1 * sb;
                const double z2 = -x * sb + z1 * cb;
                const double inverse = 1.0 / (z2 + 6.0);
                const int col = static_cast<int>(
                    std::floor(width / 2 + 44 * x2 * inverse));
                const int row = static_cast<int>(
                    std::floor(height / 2 - 22 * y1 * inverse));
                if (col < 0 || col >= width || row < 0 || row >= height)
                    continue;

                // A depth buffer keeps only the nearest surface.
                const int index = row * width + col;
                if (inverse <= depth[index]) continue;
                depth[index] = inverse;

                // Transform the normal and shade with a fixed light.
                const double ny = su * cv * ca - sv * sa;
                const double nz1 = su * cv * sa + sv * ca;
                const double nz = -cu * cv * sb + nz1 * cb;
                const double light = std::clamp(.3 + .45 * ny - .5 * nz, 0.0, 1.0);
                pixels[index] = shades[static_cast<int>(light * 11)];
            }
        }

        std::string screen;
        screen.reserve((width + 1) * height);
        for (int row = 0; row < height; ++row) {
            screen.append(pixels.data() + row * width, width);
            screen.push_back('\n');
        }
        return screen;
    }
};
} // namespace unova

int main(int argc, char* argv[]) {
    unova::AsciiRenderer renderer;
    // An optional frame index makes the output deterministic for testing.
    if (argc == 2) {
        try {
            const double t = std::stod(argv[1]) / unova::fps;
            if (!std::isfinite(t) || t < 0) return 1;
            std::cout << renderer.render(.6 + t * .52, t * .31);
            return 0;
        } catch (...) { return 1; }
    }
    if (argc != 1) return 1;

    // Redraw the same terminal area for a 30-second animation.
    std::cout << "\x1b[2J";
    for (int frame = 0; frame < 360; ++frame) {
        const auto next = std::chrono::steady_clock::now()
            + std::chrono::milliseconds(83);
        const double t = frame / unova::fps;
        std::cout << "\x1b[H" << renderer.render(.6 + t * .52, t * .31)
                  << std::flush;
        std::this_thread::sleep_until(next);
    }
    return 0;
}
