import axios from "axios";

const API_ROOT = (import.meta.env.VITE_API_URL ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

const client = axios.create({
    baseURL: `${API_ROOT}/api`,

    withCredentials: true,
    withXSRFToken: true,

    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

client.interceptors.response.use(
    (response) => response,

    (error) => {
        if (error?.response?.status === 401) {
            sessionStorage.removeItem("lumelex_authenticated");

            if (window.location.pathname !== "/login") {
                window.location.replace("/login");
            }
        }

        return Promise.reject(error);
    },
);

export const getCsrfCookie = async () => {
    await axios.get(
        `${API_ROOT}/sanctum/csrf-cookie`,
        {
            withCredentials: true,
            withXSRFToken: true,
        }
    );
};

export default client;