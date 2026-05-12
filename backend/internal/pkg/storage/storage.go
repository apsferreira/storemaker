package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/apsferreira/storemaker/internal/pkg/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Client encapsula o cliente MinIO e as configurações do bucket.
type Client struct {
	mc        *minio.Client
	bucket    string
	publicURL string
}

// New cria e retorna um Client MinIO pronto para uso.
// Garante que o bucket exista e tenha política de leitura pública.
func New(cfg config.MinIOConfig) (*Client, error) {
	if cfg.AccessKey == "" || cfg.SecretKey == "" {
		return nil, fmt.Errorf("storage: MINIO_ACCESS_KEY e MINIO_SECRET_KEY são obrigatórios")
	}

	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: falha ao criar cliente MinIO: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := mc.BucketExists(ctx, cfg.Bucket)
	if err != nil {
		return nil, fmt.Errorf("storage: falha ao verificar bucket %q: %w", cfg.Bucket, err)
	}

	if !exists {
		if err = mc.MakeBucket(ctx, cfg.Bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("storage: falha ao criar bucket %q: %w", cfg.Bucket, err)
		}

		// Política de leitura pública para que as URLs geradas sejam acessíveis via browser.
		policy := fmt.Sprintf(`{
			"Version":"2012-10-17",
			"Statement":[{
				"Effect":"Allow",
				"Principal":{"AWS":["*"]},
				"Action":["s3:GetObject"],
				"Resource":["arn:aws:s3:::%s/*"]
			}]
		}`, cfg.Bucket)

		if err = mc.SetBucketPolicy(ctx, cfg.Bucket, policy); err != nil {
			// Não fatal — bucket foi criado com sucesso; avisar apenas.
			fmt.Printf("storage: aviso — falha ao aplicar política pública no bucket %q: %v\n", cfg.Bucket, err)
		}
	}

	return &Client{
		mc:        mc,
		bucket:    cfg.Bucket,
		publicURL: cfg.PublicURL,
	}, nil
}

// Upload envia um arquivo para o MinIO e retorna sua URL pública.
//
// objectName deve seguir o padrão "stores/<storeID>/products/<productID>/<uuid>.<ext>".
// size pode ser -1 quando o tamanho é desconhecido (o SDK fará multipart upload).
func (c *Client) Upload(ctx context.Context, objectName string, r io.Reader, size int64, contentType string) (string, error) {
	_, err := c.mc.PutObject(ctx, c.bucket, objectName, r, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("storage: falha ao fazer upload de %q: %w", objectName, err)
	}

	// Monta URL pública sem scheme extra caso publicURL já inclua https://.
	url := fmt.Sprintf("%s/%s/%s", c.publicURL, c.bucket, objectName)
	return url, nil
}

// Delete remove um objeto do bucket.
func (c *Client) Delete(ctx context.Context, objectName string) error {
	err := c.mc.RemoveObject(ctx, c.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("storage: falha ao deletar %q: %w", objectName, err)
	}
	return nil
}
