from django.http import JsonResponse
from urllib.parse import quote
from random import randint
from django.core.cache import cache


def get_state():    # 返回随机8位state码
    res = ""
    for i in range(8):
        res += str(randint(0, 9))
    return res


def apply_code(request):
    # 传递的四个参数
    appid = "4877"
    redirect_uri = quote("https://app4877.acapp.acwing.com.cn/settings/acwing/acapp/receive_code") # 重定向的链接地址
    scope = "userinfo"
    state = get_state()

    cache.set(state, True, 7200)    # 把随机state存到redis，有效期2小时


    return JsonResponse({
        'result': "success",
        'appid': appid,
        'redirect_uri': redirect_uri,
        'scope': scope,
        'state': state,
    })
