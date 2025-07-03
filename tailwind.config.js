/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#3D5AFE', // Warna biru neon yang akan kita gunakan
      },
      boxShadow: {
        'neon-sm': '0 0 5px rgba(61, 90, 254, 0.4)', // Bayangan neon kecil
        'neon-md': '0 0 10px rgba(61, 90, 254, 0.6)', // Bayangan neon sedang
        'neon-lg': '0 0 15px rgba(61, 90, 254, 0.8), 0 0 20px rgba(61, 90, 254, 0.4)', // Bayangan neon besar
      },
    },
  },
  plugins: [],
}