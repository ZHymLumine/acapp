from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from game.models.player.player import Player


class InfoView(APIView):
    permission_classes = ([IsAuthenticated])  # 需要用户验证

    def get(self, request):
        user = request.user
        player = Player.objects.get(user=user)

        # 用自带的Response函数返回
        return Response({
            'result': "success",
            'username': user.username,
            'photo': player.photo,
        })
