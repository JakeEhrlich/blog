export default {
  title: "This is just to say",
  description:
    "A place to yell neat ideas into the void, hoping someone else will find them neat",
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "Home", link: "/" },
      { text: "Posts", link: "/posts" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/JakeEhrlich" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "© 2024 Jake Ehrlich",
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            pyodide: [],
          },
        },
      },
    },
    optimizeDeps: {
      // exclude: [
      //   "pyodide",
      //   "codemirror",
      //   "@codemirror/language",
      //   "@codemirror/state",
      //   "@codemirror/view",
      //   "@codemirror/lang-python",
      // ],
    },
    server: {
      fs: {
        // Allow serving files from node_modules
        allow: [".."],
      },
    },
  },
};
