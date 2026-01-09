import Elysia from "elysia";
import { proxy } from "./waldo/proxy";

export const server = new Elysia().mount(proxy);
