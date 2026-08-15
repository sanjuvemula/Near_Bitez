import { useContext } from "react";
import { VendorContext } from "@/context/VendorContext";

/** Shared vendor overview, orders and status actions. */
export const useVendor = () => useContext(VendorContext);
