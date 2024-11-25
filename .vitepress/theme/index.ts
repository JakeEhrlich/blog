import DefaultTheme from "vitepress/theme";
import PythonPlayground from "./components/PythonPlayground.vue";
import "./custom.css";

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component("PythonPlayground", PythonPlayground);
  },
};
