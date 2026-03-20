import { isRecord } from "./typeGuards";

/**
 * 请求 API
 * @template T 响应数据类型
 * @param {string} input  API URL
 * @param {(unknown) => boolean} validateData  响应数据验证函数
 * @param {RequestInit} init  请求配置选项
 * @returns {Promise<T>}  响应数据
 */
export async function requestApi<T>(
  input: string,
  validateData: (data: unknown) => data is T,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("响应 JSON 解析失败");
  }

  if (!isRecord(payload) || typeof payload.success !== "boolean") {
    throw new Error("响应结构不合法");
  }

  if (!payload.success) {
    const errText =
      typeof payload.error === "string" ? payload.error : "请求失败";
    throw new Error(errText);
  }

  if (!("data" in payload) || !validateData(payload.data)) {
    throw new Error("响应 data 结构不合法");
  }

  return payload.data;
}
