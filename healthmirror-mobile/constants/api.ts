// constants/api.ts
//export const API = "http://10.68.7.207:3001/api";
import Constants from "expo-constants";
 
const host = Constants.expoConfig?.hostUri?.split(":")[0];
 
export const API = `http://${host}:3001/api`; 