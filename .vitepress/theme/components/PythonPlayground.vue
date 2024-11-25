<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from "vue";
import { loadPyodide } from "pyodide";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";

const code = ref(`# Example of using delta time for smooth animation
import random
import math

# Initialize state if it doesn't exist
if not hasattr(store, 'circles'):
    store.circles = []
    store.elapsed = 0  # Total time elapsed

# Update positions based on time
store.elapsed += dt  # dt is delta time in seconds

# Add a new circle every 0.5 seconds
if not hasattr(store, 'last_spawn'):
    store.last_spawn = 0

if store.elapsed - store.last_spawn > 0.5:
    # Add a new circle with random color
    colors = ['red', 'blue', 'green', 'purple', 'orange']
    new_circle = {
        'x': random.randint(50, 350),
        'y': random.randint(50, 250),
        'radius': random.randint(10, 30),
        'color': random.choice(colors),
        'speed': random.uniform(50, 150),  # pixels per second
        'angle': random.uniform(0, 2 * math.pi)
    }
    store.circles.append(new_circle)
    store.last_spawn = store.elapsed
    print(f"Added circle at ({new_circle['x']}, {new_circle['y']})")

# Update and draw all circles
canvas.clear()
for circle in store.circles:
    # Update position based on speed and time
    circle['x'] += math.cos(circle['angle']) * circle['speed'] * dt
    circle['y'] += math.sin(circle['angle']) * circle['speed'] * dt

    # Bounce off walls
    if circle['x'] < circle['radius'] or circle['x'] > 400 - circle['radius']:
        circle['angle'] = math.pi - circle['angle']
    if circle['y'] < circle['radius'] or circle['y'] > 300 - circle['radius']:
        circle['angle'] = -circle['angle']

    # Draw the circle
    canvas.fill_style = circle['color']
    canvas.begin_path()
    canvas.arc(circle['x'], circle['y'], circle['radius'], 0, 2 * math.pi)
    canvas.fill()

print(f"FPS: {1/dt:.1f}")`);

const canvasRef = ref(null);
const editorRef = ref(null);
const editorView = shallowRef(null);
const isLoading = ref(false);
const isRunning = ref(false);
const animationId = ref(null);
const lastTime = ref(null);
let pyodide = null;

// Storage class to maintain state between runs
class Storage {
    constructor() {
        this._data = {};
    }

    get(key) {
        return this._data[key];
    }

    set(key, value) {
        this._data[key] = value;
    }
}

// Canvas wrapper class
class CanvasWrapper {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    set fill_style(color) {
        this.ctx.fillStyle = color;
    }

    set stroke_style(color) {
        this.ctx.strokeStyle = color;
    }

    set line_width(width) {
        this.ctx.lineWidth = width;
    }

    fill_rect(x, y, width, height) {
        this.ctx.fillRect(x, y, width, height);
    }

    begin_path() {
        this.ctx.beginPath();
    }

    arc(x, y, radius, start_angle, end_angle) {
        this.ctx.arc(x, y, radius, start_angle, end_angle);
    }

    move_to(x, y) {
        this.ctx.moveTo(x, y);
    }

    line_to(x, y) {
        this.ctx.lineTo(x, y);
    }

    close_path() {
        this.ctx.closePath();
    }

    fill() {
        this.ctx.fill();
    }

    stroke() {
        this.ctx.stroke();
    }
}

async function initPyodide() {
    if (!pyodide) {
        isLoading.value = true;
        pyodide = await loadPyodide({
            indexURL: import.meta.env.BASE_URL + "node_modules/pyodide/",
        });

        // Create and expose canvas wrapper instance
        const canvas = new CanvasWrapper(canvasRef.value);
        pyodide.globals.set("canvas", canvas);

        // Create and expose storage instance
        const store = new Storage();
        pyodide.globals.set("store", store);

        // Redirect print to console
        pyodide.setStdout({
            batched: (msg) => {
                console.log(msg);
            },
        });

        isLoading.value = false;
    }
    return pyodide;
}

async function runCode(dt = 0) {
    try {
        isLoading.value = true;
        const py = await initPyodide();
        // Set delta time in Python
        py.globals.set("dt", dt);
        await py.runPython(editorView.value.state.doc.toString());
    } catch (err) {
        console.error(err.toString());
    } finally {
        isLoading.value = false;
    }
}

function startAnimation() {
    if (!isRunning.value) {
        isRunning.value = true;
        lastTime.value = performance.now();
        const animate = async (currentTime) => {
            if (isRunning.value) {
                // Calculate delta time in seconds
                const dt = (currentTime - lastTime.value) / 1000;
                lastTime.value = currentTime;

                await runCode(dt);
                animationId.value = requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
}

function stopAnimation() {
    isRunning.value = false;
    if (animationId.value !== null) {
        cancelAnimationFrame(animationId.value);
        animationId.value = null;
    }
}

// Add this function with your other functions
function resetAnimation() {
    stopAnimation(); // Stop any running animation first
    if (pyodide) {
        // Clear the stored circles
        const store = new Storage();
        pyodide.globals.set("store", store);
        // Clear the canvas
        const canvas = new CanvasWrapper(canvasRef.value);
        canvas.clear();
        pyodide.globals.set("canvas", canvas);
    }
}

// Initialize CodeMirror
onMounted(() => {
    if (canvasRef.value) {
        canvasRef.value.width = 400;
        canvasRef.value.height = 300;
    }

    if (editorRef.value) {
        editorView.value = new EditorView({
            doc: code.value,
            extensions: [
                basicSetup,
                python(),
                EditorView.theme({
                    "&": {
                        height: "300px",
                        maxHeight: "300px",
                    },
                    ".cm-content": {
                        fontFamily: "monospace",
                        fontSize: "14px",
                    },
                    ".cm-gutters": {
                        border: "none",
                        borderRight: "1px solid var(--vp-c-divider)",
                    },
                }),
            ],
            parent: editorRef.value,
        });
    }
});

// Cleanup
onUnmounted(() => {
    stopAnimation();
    if (editorView.value) {
        editorView.value.destroy();
    }
});
</script>

<template>
    <div class="python-playground">
        <div class="playground-container">
            <!-- Editor -->
            <div class="editor" ref="editorRef"></div>

            <!-- Canvas Output -->
            <div class="output">
                <canvas ref="canvasRef"></canvas>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls">
            <button
                @click="runCode(0)"
                :disabled="isLoading || isRunning"
                class="run"
            >
                {{ isLoading ? "Running..." : "Run Once" }}
            </button>
            <button
                @click="startAnimation"
                :disabled="isLoading || isRunning"
                class="start"
            >
                Start Animation
            </button>
            <button @click="stopAnimation" :disabled="!isRunning" class="stop">
                Stop Animation
            </button>
            <button @click="resetAnimation" :disabled="isRunning" class="reset">
                Reset
            </button>
        </div>
    </div>
</template>

<style>
/* Global styles for CodeMirror */
.cm-editor {
    height: 100%;
    width: 100%;
}

.cm-editor.cm-focused {
    outline: none;
}

.cm-line {
    padding: 0 8px;
}
</style>

<style scoped>
.python-playground {
    margin: 1rem 0;
    width: 90vw;
    margin-left: -30%;
}

.playground-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
    min-height: 300px;
}

.editor,
.output {
    border: 1px solid var(--vp-c-divider);
    border-radius: 4px;
    overflow: hidden;
    height: 300px;
}

.output {
    background: white;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

canvas {
    max-width: 100%;
    background: white;
}

.controls {
    text-align: center;
    display: flex;
    gap: 1rem;
    justify-content: center;
}

button {
    padding: 0.5rem 1rem;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.run {
    background: var(--vp-c-brand);
}

.start {
    background: #4caf50;
}

.stop {
    background: #f44336;
}

.reset {
    background: #607d8b; /* Or any color you prefer */
}

@media (max-width: 1024px) {
    .playground-container {
        grid-template-columns: 1fr;
    }

    .controls {
        flex-direction: column;
    }
}
</style>
