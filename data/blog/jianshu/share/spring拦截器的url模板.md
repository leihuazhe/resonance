```
    Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (handler instanceof DefaultServletHttpRequestHandler) {
            return true;
        }
        if (logger.isInfoEnabled()) {
            System.out.println(handler.getClass().getName() + "==>" + request.getRequestURL());
        }

        /*String requestType = request.getHeader("X-Requested-With");
        String path = request.getContextPath();*/

        HttpSession session = request.getSession();
        if (!isVisitFrequency(session, response)) {
            return false;
        }


        //判断session
        if (null == SessionUtil.getUser()) {

            if (isIgnoreAuthority(request, response)) {
                return true;
            }
```

这里的作用是，基于ajax的请求时，如果session过期后的响应！

```
            response.setHeader("sessionstatus", "timeout");
            response.setStatus(518);
            //	response.sendError(518, "session timeout.");
            response.setCharacterEncoding("utf-8");
            response.getWriter().write("由于您长时间没有操作,会话已失效,请重新登录!");
            response.getWriter().close();
            return false;
        }

        //静态文件
        if (handler instanceof ResourceHttpRequestHandler) {
            if (logger.isInfoEnabled()) {
                logger.info("ResourceHttpRequestHandler");
            }
            return true;
        }

        // 后台请求
        if (handler instanceof HandlerMethod) {
            HandlerMethod handlerMethod = (HandlerMethod) handler;
            if (handlerMethod.getBean() instanceof BasicErrorController) {
                if (logger.isInfoEnabled()) {
                    logger.info("**************BasicErrorController **********");
                }
                return true;
            }
            // 为Control清除参数
            BaseController bc = (BaseController) handlerMethod.getBean();
            bc.clearParamMap();
            String className = handlerMethod.getBean().getClass().getSimpleName();
            String method = handlerMethod.getMethod().getName();
            String auth = className + "." + method;

            if (logger.isInfoEnabled()) {
                if (logger.isInfoEnabled()) {
                    logger.info("访问权限：" + auth);
                }
            }
            //特殊Controller 放行
            if ("XXXXXControl".equalsIgnoreCase(className)) {
                return true;
            }

            if (!SessionUtil.getUser().hasAuth(auth)) { // 检查有无操作权限
                response.setHeader("statusText", "Unauthorized");
                response.setStatus(401);
                //response.sendError(401 , "no auth.");
                response.setCharacterEncoding("utf-8");
                response.getWriter().write("您没有相关功能的操作权限，请与系统管理员联系！");
                // response.getWriter().write("您没有相关功能的操作权限!");
                response.getWriter().close();
                return false;
            }

        }
        return true;
    }


    // 防无限请求或刷新
    private boolean isVisitFrequency(HttpSession session, HttpServletResponse response) throws Exception {
        Long period_time = 5 * 1000L;
        int period_count = 10;
        if (session.getAttribute("lastVisitTime") == null) {
            session.setAttribute("lastVisitTime", new Long[]{System.currentTimeMillis(), 0L});
            return true;
        } else {
            Long[] data = (Long[]) session.getAttribute("lastVisitTime");
            long now = System.currentTimeMillis();
            if (data[1] == -1) {
                if (now - data[0] > period_time) {
                    data[0] = now;
                    data[1] = 0L;
                } else {
                    response.setHeader("statusText", "Unauthorized");
                    response.setStatus(401);
                    //response.sendError(401 , "no auth.");
                    response.setCharacterEncoding("utf-8");
                    response.getWriter().write("您访问速度过快，请等待" + Math.round(5 - (now - data[0]) / 1000) + "秒后继续访问!");
                    // response.getWriter().write("您没有相关功能的操作权限!");
                    response.getWriter().close();
                    return false;
                }
            } else {
                if (now - data[0] < period_time) {
                    data[1]++;
                } else {
                    data[0] = now;
                    data[1] = 0L;
                }
                if (data[1] > period_count) { // 访问不能超过5次
                    data[1] = -1L;
                }
            }
        }
        return true;
    }


    // 防无限请求或刷新

    /**
     * @param request
     * @return
     * @throws Exception
     */
    private boolean isIgnoreAuthority(HttpServletRequest request, HttpServletResponse response) throws Exception {
        String _ignore_authority_key = request.getParameter(SessionUtil.IGNORE_AUTHORITY);
        if (StringUtils.isNotBlank(_ignore_authority_key)
               /* && _ignore_authority_key.equalsIgnoreCase(SessionUtil.IGNORE_AUTHORITY_KEY)*/) {
            String userName = null;
            try {
                userName = AESUtil.aesDecrypt(_ignore_authority_key, SessionUtil.AES_SECRET_KEY);
            } catch (Exception ex) {
                //ex.printStackTrace();
                System.out.println("解密出错 ：" + ex.getMessage());
                userName = "admin";
            }

            System.out.println("*********isIgnoreAuthority*********** user = " + userName);
            HashMap<String, Object> paramMap = new HashMap<String, Object>();
            SysUser loginUser = null;
            HttpSession session = request.getSession();
            List<Menu> menus = null;
            List<ReportStore> storeAuths = null;
            MenuService menuService = (MenuService) SpringContextUtil.getBean("menuService");
            UserService userService = (UserService) SpringContextUtil.getBean("userService");

            //普通用户登录
            paramMap.put("user_name", userName);
            loginUser = userService.getUserByName(paramMap);

            if (loginUser == null) {
                loginUser = new SysUser();
                loginUser.setUserName("100000");
                loginUser.setLoginPassword("******");
                loginUser.setNickName("超级管理员");
                loginUser.setSingleLogin(Constants.STATUS_YES);//超级管理员只能单点登录

                paramMap.clear();
                paramMap.put("parentId", "0");
                menus = menuService.getMenuStructure(paramMap);
                storeAuths = userService.queryUserStoreAuths(null);
            } else {
                paramMap.clear();
                paramMap.put("user_id", loginUser.getId());
                paramMap.put("flag", Constants.STATUS_YES);
                storeAuths = userService.queryUserStoreAuths(paramMap);

                //用户拥有的  菜单和报表权限
                List<String> userMenuAuths = menuService.queryUserMenuAuths(paramMap);
                session.setAttribute(SessionUtil.REPORT_MENU_AUTHS, userMenuAuths);

                paramMap.clear();
                paramMap.put("parentId", "0");
                menus = menuService.getMenuStructure(paramMap);
                //普通用户登录要 过滤权限
                //SessionUtil.filterUserMenus(menus);
                SessionUtil.filterUserMenuOrReports(menus);
            }
            //设置用户菜单和访问权限到Sysuser中
            loginUser.setMenuList(menus);
            //设置用户单店权限到Sysuser中
            loginUser.setStoreAuths(storeAuths);

            //用户菜单
            session.setAttribute(SessionUtil.MENU, menus);
            //用户单店
            session.setAttribute(SessionUtil.STORE, storeAuths);
            //用户信息
            session.setAttribute(SessionUtil.LOGIN_USER, loginUser);

            //最新的登录时间
            session.setAttribute(SessionUtil.LAST_LOGIN_TIME, DateConvertUtil.generateDateTime(new Date(), DateConvertUtil.TIMESTATMP_FORMAT));

            // 设置返回 连接 URLEncoder.encode(URLDecoder.decode(request.getCookies()[2].getValue()))
            SessionUtil.addCookie("backUrl", URLDecoder.decode("../../hxnc/index"));
            return true;
        }

        return false;
    }

```
