import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import bgmain from "../assets/bg-main.jpg";
import dumbells from "../assets/dumbbells.avif";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { pwaInstall, isPWAInstalled, getPWADisplayMode } from "@/lib/pwa";
import { useState, useEffect } from "react";
import img1 from "../assets/img1.jpg";
import img2 from "../assets/img2.jpg";
import img3 from "../assets/img3.jpg";
import img4 from "../assets/img4.jpg";

const Home = () => {
    const { user, isAuthenticated, isMemberAuthenticated, isLoading } = useAuth();
    const [, navigate] = useLocation();
    const [installing, setInstalling] = useState(false);

    // Auto-redirect authenticated users to their dashboard
    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                navigate("/dashboard");
            } else if (isMemberAuthenticated) {
                navigate("/member");
            }
        }
    }, [isLoading, isAuthenticated, isMemberAuthenticated, navigate]);

    // If user is authenticated, show the full app layout
    if (isAuthenticated) {
        return (
            <Layout>
            <div
                className="flex flex-col items-center justify-center h-screen"
                style={{
                    margin: "-25px -50px 0",
                    backgroundImage: `linear-gradient(to top, rgb(14 22 41 / 1), rgba(0, 0, 0, 0.5)), url(${bgmain})`,
                    backgroundSize: "125%,125%",
                    backgroundPositionX: "center, center",
                }}
            >
                <h1 className="text-8xl font-bold text-white">Fit.</h1>
                <h2 className="text-8xl font-bold text-white">Fast.</h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--accent) / 1)" }}
                >
                    Forever.
                </h2>
                <div className="flex flex-col gap-4 mt-10">
                    <Button
                        variant={"outline"}
                        style={{ color: "hsl(var(--accent))" }}
                    >
                        Book your slot today!
                    </Button>
                    {!isPWAInstalled() && (
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                setInstalling(true);
                                try {
                                    const success = await pwaInstall.showInstallDialog();
                                    if (success) {
                                        console.log('PWA installed successfully');
                                    }
                                } catch (error) {
                                    console.error('PWA install failed:', error);
                                } finally {
                                    setInstalling(false);
                                }
                            }}
                            disabled={installing}
                            className="gap-2"
                        >
                            <Smartphone className="h-4 w-4" />
                            {installing ? 'Installing...' : 'Install Gym Genie App'}
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <div
                className="flex flex-col items-start justify-center h-screen"
                style={{
                    margin: "0px -50px 0",
                    backgroundImage: `url(${dumbells})`,
                    backgroundSize: "contain",
                    backgroundPosition: "left bottom",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: "#fafafa",
                    paddingLeft: "50%",
                }}
            >
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--background))" }}
                >
                    Equipments
                </h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--background))" }}
                >
                    that
                </h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--accent))" }}
                >
                    Empowers.
                </h2>
                <Button
                    variant={"outline"}
                    style={{ color: "hsl(var(--background))" }}
                    className="mt-10"
                >
                    Shop Now
                </Button>
            </div>
            {/* gallery */}
            <div className="py-16 bg-gradient-to-b from-white to-gray-50" style={{ margin: "0px -50px 0" }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Our Gallery
                        </h2>
                        <p className="text-lg text-gray-600">
                            Explore our state-of-the-art facilities and
                            equipment
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img4}
                                alt="Gym Equipment 1"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Premium Equipment
                                </h3>
                                <p className="text-sm text-gray-200">
                                    State-of-the-art machines
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img3}
                                alt="Gym Equipment 2"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Functional Training
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Dynamic workout spaces
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img2}
                                alt="Gym Equipment 3"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Cardio Zone
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Premium cardio equipment
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img1}
                                alt="Gym Equipment 4"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Free Weights
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Complete weight selection
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
    }

    // For unauthenticated users, show landing page with login button
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero Section */}
            <div
                className="flex flex-col items-center justify-center h-screen relative"
                style={{
                    margin: "-25px -50px 0",
                    backgroundImage: `linear-gradient(to top, rgb(14 22 41 / 1), rgba(0, 0, 0, 0.5)), url(${bgmain})`,
                    backgroundSize: "125%,125%",
                    backgroundPositionX: "center, center",
                }}
            >
                <h1 className="text-8xl font-bold text-white">Fit.</h1>
                <h2 className="text-8xl font-bold text-white">Fast.</h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--accent) / 1)" }}
                >
                    Forever.
                </h2>
                <div className="flex gap-4 mt-10">
                    <Button
                        variant={"outline"}
                        style={{ color: "hsl(var(--accent))" }}
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </Button>
                    {/* <Button
                        variant={"default"}
                        className="bg-accent hover:bg-accent/90"
                    >
                        Book your slot today!
                    </Button> */}
                </div>
            </div>

            {/* Equipment Section */}
            <div
                className="flex flex-col items-start justify-center h-screen"
                style={{
                    margin: "0px -50px 0",
                    backgroundImage: `url(${dumbells})`,
                    backgroundSize: "contain",
                    backgroundPosition: "left bottom",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: "#fafafa",
                    paddingLeft: "50%",
                }}
            >
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--background))" }}
                >
                    Equipments
                </h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--background))" }}
                >
                    that
                </h2>
                <h2
                    className="text-8xl font-bold text-white"
                    style={{ color: "hsl(var(--accent))" }}
                >
                    Empowers.
                </h2>
                <Button
                    variant={"outline"}
                    style={{ color: "hsl(var(--background))" }}
                    className="mt-10"
                >
                    Shop Now
                </Button>
            </div>

            {/* Gallery */}
            <div className="py-16 bg-gradient-to-b from-white to-gray-50" style={{ margin: "0px -50px 0" }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Our Gallery
                        </h2>
                        <p className="text-lg text-gray-600">
                            Explore our state-of-the-art facilities and
                            equipment
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img4}
                                alt="Gym Equipment 1"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Premium Equipment
                                </h3>
                                <p className="text-sm text-gray-200">
                                    State-of-the-art machines
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img3}
                                alt="Gym Equipment 2"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Functional Training
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Dynamic workout spaces
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img2}
                                alt="Gym Equipment 3"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Cardio Zone
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Premium cardio equipment
                                </p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <img
                                src={img1}
                                alt="Gym Equipment 4"
                                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <h3 className="text-xl font-semibold">
                                    Free Weights
                                </h3>
                                <p className="text-sm text-gray-200">
                                    Complete weight selection
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
