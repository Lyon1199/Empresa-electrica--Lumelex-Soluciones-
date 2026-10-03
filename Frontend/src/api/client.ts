import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const client = axios.create({

    baseURL: `${API_URL}/api`,

    withCredentials: true,

    withXSRFToken: true,

    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },

});


/*
|--------------------------------------------------------------------------
| INTERCEPTOR
|--------------------------------------------------------------------------
*/

client.interceptors.response.use(

    (response) => {
        return response;
    },

    (error) => {

        if (
            error?.response?.status === 401
        ) {

            sessionStorage.removeItem(
                "lumelex_authenticated"
            );

            if (
                window.location.pathname !==
                "/login"
            ) {

                window.location.replace(
                    "/login"
                );

            }

        }

        return Promise.reject(error);
    }

);


/*
|--------------------------------------------------------------------------
| CSRF
|--------------------------------------------------------------------------
*/

export const getCsrfCookie = async () => {

    await axios.get(
        `${API_URL}/sanctum/csrf-cookie`,
        {
            withCredentials: true,
            withXSRFToken: true,
        }
    );

};


export default client;