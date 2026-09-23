import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true, // send/receive the httpOnly "token" cookie on every request
});

export default API;