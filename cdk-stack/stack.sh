
set -e


if [ "$STACK_ENV" = "local" ]
then
    alias cdk="cdklocal"
fi


case "$1" in

    synthesize)
        cdk synthesize
        ;;

    deploy)
        cdk bootstrap
        cdk deploy
        ;;

    *)
        echo "Unkown stack option"
        exit 1
        ;;

esac
