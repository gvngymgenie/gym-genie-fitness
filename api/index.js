// API entry point for Vercel serverless functions
// This imports from the built server code

let handlerPromise = null;

async function getHandler() {
  if (handlerPromise) return handlerPromise;
  
  handlerPromise = (async () => {
    try {
      const module = await import("../dist/index.cjs");
      
      // Handle both ES module default export and CJS module.exports
      // The CJS module.exports is stored in module.default when imported via ES import
      let handler = module.default;
      
      // If default is an object with a default property (common with ES interop), unwrap it
      if (handler && handler.default) {
        handler = handler.default;
      }
      
      // If it's still not a function, it might be the whole module
      if (typeof handler !== 'function') {
        handler = module.default || module.handler || module;
      }
      
      return handler;
    } catch (error) {
      console.error("[API] Failed to load handler:", error);
      return function(req, res) {
        res.status(500).json({ error: "Failed to load handler", message: error.message });
      };
    }
  })();
  
  return handlerPromise;
}

export default async function(req, res) {
  try {
    const handler = await getHandler();
    if (typeof handler !== 'function') {
      return res.status(500).json({ error: "Handler is not a function" });
    }
    return handler(req, res);
  } catch (error) {
    console.error("[API] Handler error:", error);
    res.status(500).json({ error: "Handler error", message: error.message });
  }
}
