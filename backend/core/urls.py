from rest_framework.routers import DefaultRouter

from .views import CarteraViewSet

router = DefaultRouter()
router.register("cartera", CarteraViewSet, basename="cartera")

urlpatterns = router.urls
