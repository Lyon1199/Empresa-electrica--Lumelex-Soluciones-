import client, {
    getCsrfCookie,
} from "../api/client";


interface LoginData {
    email: string;
    password: string;
}

export interface AuthenticatedUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
    customer_id: number | null;
    must_change_password: boolean;
}

let authenticatedUser: AuthenticatedUser | null = null;
let pendingUser: Promise<AuthenticatedUser> | null = null;

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export const login = async (
    data: LoginData
) => {

    await getCsrfCookie();

    const response = await client.post(
        "/login",
        data
    );

    sessionStorage.setItem(
        "lumelex_authenticated",
        "true"
    );
    authenticatedUser = response.data.user as AuthenticatedUser;

    return response.data;
};


/*
|--------------------------------------------------------------------------
| USUARIO AUTENTICADO
|--------------------------------------------------------------------------
*/

export const getAuthenticatedUser = async () => {
    if (authenticatedUser) return authenticatedUser;
    if (pendingUser) return pendingUser;

    pendingUser = client.get("/user")
        .then((response) => {
            authenticatedUser = response.data.user as AuthenticatedUser;
            return authenticatedUser;
        })
        .finally(() => {
            pendingUser = null;
        });
    return pendingUser;
};


/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export const logout = async () => {

    try {
        const response = await client.post(
            "/logout"
        );

        return response.data;

    } finally {
        authenticatedUser = null;
        pendingUser = null;

        /*
        |--------------------------------------------------------------
        | Eliminar marca local
        |--------------------------------------------------------------
        */

        sessionStorage.removeItem(
            "lumelex_authenticated"
        );

    }
};