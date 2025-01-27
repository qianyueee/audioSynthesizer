/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/index.html'
    ],
    theme: {
      extend: {
        colors: {
          // 可以添加自定义颜色
        },
        spacing: {
          // 可以添加自定义间距
        }
      },
    },
    plugins: [],
    darkMode: 'class', // 支持暗色模式（可选）
  }