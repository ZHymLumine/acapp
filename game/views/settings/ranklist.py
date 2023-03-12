from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from game.models.player.player import Player


class RanklistView(APIView):
    permission_classes = ([IsAuthenticated])    # 加上身份验证

    def get(self, request):
        players = Player.objects.all().order_by('-score')[:11]  # 取出分数最高的前十名
        resp = []
        for player in players:
            resp.append({
                'username': player.user.username,
                'photo': player.photo,
                'score': player.score,
            })
        return Response(resp)

