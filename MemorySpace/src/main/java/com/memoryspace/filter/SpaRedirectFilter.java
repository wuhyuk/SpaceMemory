package com.memoryspace.filter;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter("/*")  // MemorySpace 컨텍스트 안의 모든 요청을 한 번 거침
public class SpaRedirectFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {

        HttpServletRequest req  = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        // /MemorySpace 뒤에 붙는 경로만 뽑기
        String contextPath = req.getContextPath(); // -> "/MemorySpace"
        String uri = req.getRequestURI();          // -> "/MemorySpace/signup"
        String path = uri.substring(contextPath.length()); // -> "/signup"

        // 1) API 요청은 그대로 통과 (/api/...)
        // 2) 정적 파일(js, css, png, jpg, ico 등)은 그대로 통과
        // 3) 나머지(/, /signup, /example 등)는 전부 index.jsp로 forward
        boolean isApi = path.startsWith("/api/");
        boolean hasExtension = path.matches(".*\\.[a-zA-Z0-9]+$");

        // ✅ "/" 또는 "/index.html"은 그대로 통과 (정적 파일/웰컴 페이지로 처리)
        boolean isIndexHtml = path.equals("/") || path.equals("/index.html");

        if (isApi || hasExtension || isIndexHtml) {
            chain.doFilter(request, response);
        } else {
            // ✅ 나머지 SPA 경로들은 전부 index.html로 포워드
            RequestDispatcher dispatcher = req.getRequestDispatcher("/index.html");
            dispatcher.forward(req, resp);
        }
    }
}
