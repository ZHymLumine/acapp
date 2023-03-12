from django.shortcuts import render

def index(request):
    data = request.GET
    # 接收从receive_code中返回的信息
    context = {
        'access': data.get('access', ""),
        'refresh': data.get('refresh', ""),
    }
    return render(request, "multiends/web.html", context)   # 在浏览器渲染
