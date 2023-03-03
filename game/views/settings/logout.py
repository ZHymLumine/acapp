from django.http import JsonResponse
from django.contrib.auth import logout



def signout(request):
    user = request.user
    if not user.is_authenticated:   # 没有登录
        return JsonResponse({
            'result': "success",
        })
    logout(request)     # logout
    return JsonResponse({
        'result': "success",
    })
