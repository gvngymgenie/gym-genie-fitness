// Simple test handler to verify Vercel functions work
export default function(req, res) {
  console.log("[Test] Handler called");
  console.log("[Test] Method:", req.method);
  console.log("[Test] URL:", req.url);
  
  res.status(200).json({ 
    message: "Test successful", 
    method: req.method, 
    url: req.url 
  });
}
