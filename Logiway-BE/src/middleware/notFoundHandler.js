export function notFoundHandler(request, response) {
  return response.status(404).json({
    success: false,
    error: "Endpoint tidak ditemukan.",
  });
}
