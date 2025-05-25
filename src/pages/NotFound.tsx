
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <img 
          src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
          alt="SocialChat Logo" 
          className="h-16 w-auto mx-auto mb-6" 
        />
        <h1 className="text-4xl font-bold mb-4 font-pixelated">404</h1>
        <p className="text-xl text-gray-600 mb-6 font-pixelated">Oops! Page not found</p>
        <p className="text-sm text-gray-500 mb-6 font-pixelated">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="btn-gradient font-pixelated">
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
