import jwt from "jsonwebtoken";

/**
 * 认证中间件 - 验证 JWT token 并提取用户信息
 * 类似 Spring Security 的拦截器链
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            error: "Access token is required",
            ok: false
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 将用户信息添加到 request 对象
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Token has expired",
                ok: false,
                code: "TOKEN_EXPIRED"
            });
        }
        return res.status(403).json({
            error: "Invalid or malformed token",
            ok: false,
            code: "INVALID_TOKEN"
        });
    }
}

/**
 * 角色检查中间件 - 仅允许特定角色访问
 * @param {...string} roles - 允许的角色列表
 */
export function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: "User not authenticated",
                ok: false
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required roles: ${roles.join(", ")}`,
                ok: false,
                code: "INSUFFICIENT_PERMISSIONS"
            });
        }

        next();
    };
}

/**
 * 商户所有权检查 - 确保商户只能操作自己的酒店
 * 应在路由处理器中使用
 */
export function isMerchantOwner(merchantIdFromDb) {
    return (req) => {
        if (req.user.role !== "merchant") {
            return false;
        }
        return req.user.id === merchantIdFromDb;
    };
}