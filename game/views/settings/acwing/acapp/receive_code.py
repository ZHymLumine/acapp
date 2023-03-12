from django.http import JsonResponse
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from game.models.player.player import Player
from random import randint
from rest_framework_simplejwt.tokens import RefreshToken


def receive_code(request):
    data = request.GET
    if "errcode" in data:   # 用户拒绝授权
        return JsonResponse({
            'result': "apply failed",
            'errcode': data['errcode'],
            'errmsg': data['errmsg'],
        })

    code = data.get('code')
    state = data.get('state')

    if not cache.has_key(state):    # 不是从AcWingserver发回的结果
        return JsonResponse({
            'result': "state does not exist",
        })
    cache.delete(state)

    apply_access_token_url = "https://www.acwing.com/third_party/api/oauth2/access_token/"
    params = {
        'appid': "4877",
        'secret': "87f0a69e00ad462bbca851aae6f88a2f",
        'code': code
    }

    # 申请授权令牌token
    access_token_res = requests.get(apply_access_token_url, params=params).json()

    access_token = access_token_res['access_token']
    openid = access_token_res['openid']

    players = Player.objects.filter(openid=openid)
    if players.exists():     # 如果该用户已存在，直接返回用户信息
        player = players[0]
        refresh = RefreshToken.for_user(player.user)
        # 把access token和refresh token 一起返回到acapp前端
        return JsonResponse({
            'result': "success",
            'username': player.user.username,
            'photo': player.photo,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

    get_userinfo_url = "https://www.acwing.com/third_party/api/meta/identity/getinfo/"
    params = {
        'access_token': access_token,
        'openid': openid
    }
    # 申请用户信息
    userinfo_res = requests.get(get_userinfo_url, params=params).json()
    username = userinfo_res['username']
    photo = userinfo_res['photo']

    while User.objects.filter(username=username).exists():  # 找到一个新用户名
        username += str(randint(0, 9))

    # 创建新用户和player
    user = User.objects.create(username=username)
    player = Player.objects.create(user=user, photo=photo, openid=openid)

    # 把access token和refresh token 一起返回到acapp前端
    refresh = RefreshToken.for_user(user)
    return JsonResponse({
        'result': "success",
        'username': player.user.username,
        'photo': player.photo,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })
