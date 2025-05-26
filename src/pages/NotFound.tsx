
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, MessageSquare } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-social-light-green to-social-blue">
      <div className="text-center max-w-md mx-auto p-6">
        <img 
          src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
          alt="SocialChat Logo" 
          className="h-20 w-auto mx-auto mb-6" 
        />
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-6xl font-bold mb-4 font-pixelated text-social-blue">404</h1>
          <h2 className="text-2xl font-bold mb-4 font-pixelated text-gray-800">Page Not Found</h2>
          <p className="text-gray-600 mb-6 font-pixelated text-sm leading-relaxed">
            Oops! The page you're looking for doesn't exist or has been moved. 
            Don't worry, let's get you back on track.
          </p>
          
          <div className="space-y-3">
            <Link to="/" className="block">
              <Button className="w-full btn-gradient font-pixelated text-white">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="w-full font-pixelated"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Link to="/dashboard" className="block">
              <Button variant="outline" className="w-full font-pixelated">
                <MessageSquare className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-pixelated">
              Need help? Contact{' '}
              <a 
                href="mailto:support@socialchat.site" 
                className="text-social-blue underline hover:text-social-dark-green"
              >
                support@socialchat.site
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
