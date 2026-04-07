
from django.http import HttpResponse 
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required(login_url='users:login')
def home(request):
    return render(request, "main/home.html")

@login_required(login_url='users:login')
def options(request):
    return render(request, "main/options.html")