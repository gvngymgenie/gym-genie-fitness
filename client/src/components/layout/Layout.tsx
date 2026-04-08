import { AppSidebar } from "./AppSidebar";
import generatedImage from "@assets/generated_images/dark_modern_abstract_gym_background_texture_with_geometric_shapes.png";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Background Texture */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay"
        style={{ 
          backgroundImage: `url(${generatedImage})`, 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <AppSidebar />
      <div className="md:ml-64 min-h-screen flex flex-col relative z-10">
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 md:mt-0 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
