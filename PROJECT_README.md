# Career City 2026 🏙️

A modern, professional landing page application for Career City 2026 with smooth morphing animations.

## ✨ Features

### Landing Page
- **Professional Design**: Clean, bright design with white as the dominating color
- **Vibrant Gradient Text**: Eye-catching gradient text for "Career City" using blue, purple, and pink colors
- **Blurred Background**: Custom city skyline SVG background with blur effect
- **Centered CTA Button**: "Enter the City" button prominently placed at the center
- **Smooth Animations**: Elegant entrance animations using Framer Motion

### Welcome Page
- **Smooth Morphing Transition**: The landing page morphs into the welcome page with blur and scale effects, giving a portal-entering feel
- **Two User Type Options**:
  - **Corporate**: For company representatives
  - **Habib University**: For students and faculty members
- **Interactive Cards**: Large, beautiful cards with icons, hover effects, and selection states
- **Professional Gradient Background**: Subtle gradient from white to blue/purple tones

## 🎨 Design Features

- **Bright Color Palette**: Blue (#3B82F6), Purple (#A855F7), and Pink (#EC4899) gradients
- **White Dominance**: Clean white background with subtle overlays
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Modern UI Elements**: Rounded corners, shadows, and smooth hover effects
- **Custom Icons**: SVG icons for both Corporate and University options

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd "d:\Web Projects\career-city-2026\career-city-2026"
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Technologies Used

- **Next.js 16**: React framework with App Router
- **React 19**: Latest React version
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Geist Font**: Modern, professional typography

## 📁 Project Structure

```
career-city-2026/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page with landing and welcome screens
│   └── globals.css         # Global styles
├── public/
│   └── city-background.svg # Custom city skyline background
└── package.json            # Dependencies and scripts
```

## 🎯 Animation Details

### Landing to Welcome Transition
- **Landing Exit**: Scale down (0.8), fade out, and blur (10px) over 0.8s
- **Welcome Enter**: Scale up from 1.2, fade in, and remove blur over 0.8s
- **Easing**: Custom cubic-bezier for smooth, natural motion

### Button Interactions
- **Hover**: Scale up to 1.05 with beautiful shadow effects
- **Tap**: Scale down to 0.95 for tactile feedback
- **Selection**: Border color change and ring effect

## 🎨 Color Scheme

- **Primary Colors**:
  - Blue: `#3B82F6` (rgb(59, 130, 246))
  - Purple: `#A855F7` (rgb(168, 85, 247))
  - Pink: `#EC4899` (rgb(236, 72, 153))
- **Background**: White (`#FFFFFF`) with subtle blue/purple gradients
- **Text**: Gray scales for hierarchy

## 📝 Next Steps

To extend this application, you can:

1. **Add Routing**: Create separate pages for Corporate and Habib University users
2. **Add Authentication**: Implement login/signup flows
3. **Add Database**: Store user preferences and data
4. **Add More Animations**: Enhance the user experience with additional transitions
5. **Add Content**: Create dedicated sections for each user type

## 🔧 Customization

### Changing Colors
Edit the gradient colors in `app/page.tsx`:
```tsx
from-blue-600 via-purple-600 to-pink-600
```

### Changing Background
Replace `public/city-background.svg` with your own image or modify the existing SVG

### Adjusting Animations
Modify the Framer Motion configurations in the `motion.*` components

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Feel free to fork this project and customize it for your needs!

## 📄 License

This project is open source and available for educational purposes.

---

**Built with ❤️ for Career City 2026**
