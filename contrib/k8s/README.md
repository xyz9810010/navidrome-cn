# Kubernetes

使用此清单（manifest）时有几点需要注意：

1. 这会创建一个名为 `navidrome` 的命名空间（namespace）。请根据需要调整。
1. 此清单是在 [K3s](https://github.com/k3s-io/k3s) 上创建的，它使用自己的存储供应器 [local-path-provisioner](https://github.com/rancher/local-path-provisioner)。请务必根据需要更改 `PersistentVolumeClaim` 的 `storageClassName`。
1. `PersistentVolumeClaim` 为 Navidrome 的数据库设置了一个 2Gi 的卷。请根据需要调整。
1. 请务必将 `image` 标签从 `ghcr.io/navidrome/navidrome:0.49.3` 更改为最新的版本。
1. 这假定你的音乐通过 `hostPath` 挂载在宿主机上的 `/path/to/your/music/on/the/host`。请根据需要调整。
1. `Ingress` 已配置好 `cert-manager`，用于获取 Let's Encrypt TLS 证书，并使用 Traefik 进行路由。请根据需要调整。
1. `Ingress` 将服务呈现在 `navidrome.${SECRET_INTERNAL_DOMAIN_NAME}`，该域名需要已在 DNS 中配置好。
