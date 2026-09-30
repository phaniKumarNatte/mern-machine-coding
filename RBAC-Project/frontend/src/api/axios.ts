import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true, // send/receive the httpOnly access/refresh cookies on every request
});

// When an access token expires mid-session, the server replies 401. Instead of
// forcing the user to log in again, silently exchange the refresh cookie for a
// new access token and retry the original request exactly once.
let refreshInFlight: Promise<unknown> | null = null;

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRoute = originalRequest?.url?.includes("/auth/login") ||
            originalRequest?.url?.includes("/auth/refresh") ||
            originalRequest?.url?.includes("/auth/register");

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;

            try {
                // Multiple requests can 401 at once — share a single refresh call
                // instead of firing a refresh per failed request.
                refreshInFlight ??= API.post("/auth/refresh")
                    .catch((refreshErr) => {
                        // 409 means another tab/request already rotated the refresh token
                        // concurrently — the backend rejected OUR rotation, but the winner's
                        // response already updated the shared cookie jar with a fresh access
                        // token. Treat it as "already handled", not a real failure.
                        if (refreshErr.response?.status === 409) return null;
                        throw refreshErr;
                    })
                    .finally(() => {
                        refreshInFlight = null;
                    });
                await refreshInFlight;

                return API(originalRequest);
            } catch (refreshError) {
                // Refresh token is also expired/invalid — there's no way back but a
                // fresh login. Let the app know so it can drop back to the login screen.
                localStorage.removeItem("user");
                window.dispatchEvent(new Event("auth:session-expired"));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default API;
