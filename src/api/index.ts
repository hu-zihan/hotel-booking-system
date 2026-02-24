import axios from "axios";

// ==================== 类型定义 ====================

export type UserRole = "consumer" | "merchant" | "auditor";

export interface UserInfo {
  username: string;
  display_name: string;
  avatar_url: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export interface LoginData {
  user_id: string;
  username: string;
  role: UserRole;
  display_name: string;
}

export interface LoginResp {
  message: string;
  data: LoginData;
  token: string;
  ok: boolean;
}

export interface RegisterResp {
  message: string;
  ok: boolean;
  data: {
    user_id: string;
    username: string;
    role: UserRole;
    created_at: string;
  };
}

export interface UserInfoResp {
  ok: boolean;
  data: UserInfo;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  star: number;
  min_price: number;
  banner_urls?: string[];
  location?: { lat: number; lon: number };
  distance?: number;
  highlight?: Record<string, string[]>;
}

export interface SearchHotelsResp {
  ok: boolean;
  data: {
    hotels: Hotel[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    query: {
      keyword: string;
      adcode?: string;
      priceRange?: { minPrice?: string; maxPrice?: string };
      starRange?: { minStar?: string; maxStar?: string };
      location?: { latitude: string; longitude: string; radiusKm: string } | null;
    };
  };
}

export interface HotelDetail {
  id: string;
  name: string;
  address: string;
  star: number;
  min_price: number;
  room_type?: string;
  banner_urls: string[];
  hotel_info?: {
    desc?: string;
    room_type?: string;
    tags?: string[];
    facilities?: string[];
  };
  rooms?: Room[];
}

export interface Room {
  id: string;
  room_type: string;
  type?: string;
  price: number;
  breakfast: boolean;
  capacity: number;
  size: number;
  image_url?: string;
}

export interface HotelDetailResp {
  ok: boolean;
  hotel: HotelDetail;
}

export interface GeoLocation {
  city: string;
  adcode: string;
}

export interface GeoResp {
  ok: boolean;
  location: GeoLocation;
}

// ==================== HTTP 客户端 ====================

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截 - 自动带上 token
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截 - 401 清理登录态
http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ==================== Token 存储 ====================

const TOKEN_KEY = "authToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userInfo");
}

export function isLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

export function setLoggedIn(userInfo: LoginData, token: string): void {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userInfo", JSON.stringify(userInfo));
  setToken(token);
}

// ==================== 用户 API ====================

export async function login(username: string, password: string): Promise<LoginResp> {
  const resp = await http.post<LoginResp>("/user/login", { username, password });
  if (resp.data.ok && resp.data.token) {
    setLoggedIn(resp.data.data, resp.data.token);
  }
  return resp.data;
}

export async function register(username: string, password: string, role = 1): Promise<RegisterResp> {
  const resp = await http.post<RegisterResp>("/user/register", { username, password, role });
  return resp.data;
}

export async function getUserInfo(): Promise<UserInfoResp> {
  const resp = await http.get<UserInfoResp>("/user/info");
  return resp.data;
}

// ==================== 搜索 API ====================

export interface SearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  adcode?: string;
  minPrice?: number;
  maxPrice?: number;
  minStar?: number;
  maxStar?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export async function searchHotels(params: SearchParams): Promise<SearchHotelsResp> {
  const resp = await http.get<SearchHotelsResp>("/search/hotels", { params });
  return resp.data;
}

export async function getPopularHotels(limit = 10): Promise<{ ok: boolean; data: { popular: Hotel[] } }> {
  const resp = await http.get<{ ok: boolean; data: { popular: Hotel[] } }>("/search/hotels/popular", {
    params: { limit },
  });
  return resp.data;
}

export async function getHotelSuggestions(
  q: string,
  limit = 5
): Promise<{ ok: boolean; data: { suggestions: { id: string; name: string; address: string; star: number }[] } }> {
  const resp = await http.get("/search/hotels/suggest", { params: { q, limit } });
  return resp.data;
}

// ==================== 酒店详情 API ====================

export async function getHotelDetail(hotelId: string): Promise<HotelDetailResp> {
  const resp = await http.get<HotelDetailResp>("/hotels/getHotelInfo", { params: { hotelId } });
  return resp.data;
}

export async function getHotelDetailWithGeo(hotelId: string): Promise<{
  ok: boolean;
  hotel: HotelDetail;
  stations: { name: string; en_name: string; distance: number; line_name: string; line_color: string }[];
}> {
  const resp = await http.get("/hotels/getHotelInfoWithGeo", { params: { hotelId } });
  return resp.data;
}

// ==================== 地理 API ====================

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoResp> {
  const resp = await http.get<GeoResp>("/geo/location", { params: { latitude, longitude } });
  return resp.data;
}
