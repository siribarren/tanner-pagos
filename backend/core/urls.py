from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CarteraViewSet, obtener_token

router = DefaultRouter()
router.register("cartera", CarteraViewSet, basename="cartera")

urlpatterns = router.urls + [path("token/", obtener_token, name="token")]
