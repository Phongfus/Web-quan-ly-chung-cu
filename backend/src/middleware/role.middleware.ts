export const requireRole = (role: string) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not found in request" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${role}, Your role: ${req.user.role}` 
      });
    }
    next();
  };
};