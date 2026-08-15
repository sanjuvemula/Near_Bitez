import { useContext } from "react";
import { CartContext } from "@/context/CartContext";

/** Shared cart state and mutations. */
export const useCart = () => useContext(CartContext);
