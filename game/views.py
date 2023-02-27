from django.http import HttpResponse

def index(request):
    return HttpResponse("我的第一个网页!!")

